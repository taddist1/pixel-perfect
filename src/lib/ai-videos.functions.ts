import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiVideoCategories, AI_VIDEO_MAX_SECONDS, AI_VIDEO_MIN_SECONDS } from "./ai-video-rules";
import type { Json } from "@/integrations/supabase/types";

type Scene = { prompt: string; narration: string; job_id: string | null; path: string | null; status: string };

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
      duration: z.number().int().min(AI_VIDEO_MIN_SECONDS).max(AI_VIDEO_MAX_SECONDS),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { writeScript } = await import("./ai-video.server");
    const script = await writeScript(data.topic, data.category, data.duration);
    const { data: row, error } = await context.supabase
      .from("ai_videos")
      .insert({
        topic: data.topic, category: data.category, duration_seconds: data.duration,
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
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("ai_videos").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("الفيديو ما كاينش.");
    if (row.status !== "generating") return { status: row.status, done: 0, total: 0 };
    const scenes = row.scenes as unknown as Scene[];
    const total = scenes.length;
    const idx = scenes.findIndex((s) => s.status !== "done");
    const save = (patch: Record<string, unknown>) => context.supabase.from("ai_videos").update(patch).eq("id", data.id);
    if (idx === -1) {
      await save({ status: "ready" });
      return { status: "ready", done: total, total };
    }
    const ai = await import("./ai-video.server");
    const scene = scenes[idx]!;
    try {
      if (!scene.job_id) {
        scene.job_id = await ai.startClip(scene.prompt);
        scene.status = "running";
      } else {
        const job = await ai.pollClip(scene.job_id);
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
