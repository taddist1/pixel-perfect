import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiVideoCategories, AI_VIDEO_SCENE_SECONDS, timedNarration } from "./ai-video-rules";
import type { Json } from "@/integrations/supabase/types";
import { generationConsent, MAX_REFERENCE_BYTES, type ReferenceImage } from "./ai-video-continuity";

type Scene = { prompt: string; narration: string; job_id: string | null; path: string | null; status: string; reference_image?: ReferenceImage; no_video_ref?: boolean };

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("هاد الميزة خاصة بالمسؤولين.");
}

async function signScenes(scenes: Scene[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths = scenes.map((s) => s.path).filter((p): p is string => Boolean(p));
  if (!paths.length) return [];
  const { data } = await supabaseAdmin.storage.from("ai-videos").createSignedUrls(paths, 60 * 60 * 24);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export const createAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      topic: z.string().trim().min(5).max(300),
      category: z.enum(aiVideoCategories),
      script: z.string().trim().max(5000).optional(),
      referenceImage: z.object({
        data: z.string().max(4 * Math.ceil(MAX_REFERENCE_BYTES / 3)).regex(/^[A-Za-z0-9+/]+={0,2}$/),
        mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }).optional(),
      consent: generationConsent,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Validate before any paid script-writing request, independently of the browser.
    if (data.script) timedNarration(data.script);
    const ai = await import("./ai-video.server");
    const script = data.script
      ? await ai.scriptFromManual(data.topic, data.category, data.script)
      : await ai.writeScript(data.topic, data.category);
    if (script.scenes[0] && data.referenceImage) script.scenes[0].reference_image = data.referenceImage;
    const { data: row, error } = await context.supabase
      .from("ai_videos")
      .insert({
        topic: data.topic, category: data.category, duration_seconds: script.scenes.length * AI_VIDEO_SCENE_SECONDS,
        title: script.title, description: script.description,
        scenes: script.scenes as unknown as Json, status: "generating", created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("ما تسجلش الفيديو: " + error.message);
    return { id: row.id };
  });

/** Moves generation forward by one step; the admin page calls it repeatedly. */
export const advanceAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), consent: generationConsent }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("ai_videos").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("الفيديو ما كاينش.");
    if (row.status !== "generating") return { status: row.status, done: 0, total: 0 };
    const scenes = row.scenes as unknown as Scene[];
    const total = scenes.length;
    const idx = scenes.findIndex((s) => s.status !== "done");
    const save = (patch: { scenes?: Scene[]; status?: string; error?: string }) => context.supabase.from("ai_videos").update(patch as unknown as { scenes?: Json; status?: string; error?: string }).eq("id", data.id);
    if (idx === -1) {
      await save({ status: "ready" });
      return { status: "ready", done: total, total };
    }
    const ai = await import("./ai-video.server");
    const scene = scenes[idx];
    if (!scene) throw new Error("المقطع ما كاينش.");
    try {
      if (!scene.job_id) {
        let previousVideo: string | undefined;
        if (idx > 0 && !scene.no_video_ref) {
          const previous = scenes[idx - 1];
          if (previous?.status !== "done" || !previous.path) throw new Error("خاص المقطع السابق يكمل قبل توليد التالي.");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: clip, error: downloadError } = await supabaseAdmin.storage.from("ai-videos").download(previous.path);
          if (downloadError || !clip) throw new Error("ما قدرناش نحمّلو المرجع السابق؛ توقف التوليد بلا إنشاء مقطع جديد.");
          previousVideo = Buffer.from(await clip.arrayBuffer()).toString("base64");
        }
        scene.job_id = await ai.startClip(scene.prompt, previousVideo, scenes[0]?.reference_image);
        scene.status = "running";
      } else {
        const job = await ai.pollClip(scene.job_id);
        if (job.status === "failed" && idx > 0 && !scene.no_video_ref && /speech edit/i.test(job.error ?? "")) {
          // The model refuses spoken reference clips; restart this part from the shared image + continuity text only.
          scene.no_video_ref = true;
          scene.job_id = null;
          scene.status = "pending";
          await save({ scenes });
          return { status: "generating", done: idx, total };
        }
        if (job.status === "failed") {
          scene.status = "failed";
          await save({ scenes, status: "failed", error: job.error ?? "فشل توليد أحد المقاطع." });
          return { status: "failed", done: idx, total };
        }
        if (job.status === "completed") {
          const bytes = await ai.downloadClip(scene.job_id);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const path = `${data.id}/${String(idx).padStart(2, "0")}.mp4`;
          const up = await supabaseAdmin.storage.from("ai-videos").upload(path, bytes, { contentType: "video/mp4", upsert: true });
          if (up.error) throw new Error("ما تخزنش المقطع: " + up.error.message);
          scene.path = path;
          scene.status = "done";
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "وقع خطأ.";
      await save({ status: "failed", error: msg, scenes });
      return { status: "failed", done: idx, total, error: msg };
    }
    await save({ scenes });
    return { status: "generating", done: scenes.filter((s) => s.status === "done").length, total };
  });

export const retryAiVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase.from("ai_videos").select("scenes").eq("id", data.id).single();
    const scenes = ((row?.scenes ?? []) as unknown as Scene[]).map((s) => (s.status === "done" ? s : { ...s, job_id: null, status: "pending" }));
    await context.supabase.from("ai_videos").update({ scenes: scenes as unknown as Json, status: "generating", error: null }).eq("id", data.id);
    return { ok: true };
  });

export const getAiVideoClips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase.from("ai_videos").select("scenes").eq("id", data.id).single();
    return { urls: await signScenes((row?.scenes ?? []) as unknown as Scene[]) };
  });

/** Public: published, finished videos with temporary playback links. */
export const listPublishedAiVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ai_videos")
    .select("id, title, description, category, duration_seconds, scenes, created_at")
    .eq("is_published", true).eq("status", "ready")
    .order("created_at", { ascending: false }).limit(30);
  return Promise.all((data ?? []).map(async (v) => ({
    id: v.id, title: v.title, description: v.description, category: v.category, duration_seconds: v.duration_seconds,
    urls: await signScenes(v.scenes as unknown as Scene[]),
  })));
});
