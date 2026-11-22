import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ topic: z.string().trim().min(5).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("هاد الميزة خاصة بالمسؤولين.");
    const { generateArticleDraft } = await import("./article-ai.server");
    const draft = await generateArticleDraft(data.topic, getRequest().signal);
    const { data: row, error } = await context.supabase
      .from("article_drafts")
      .insert({ topic: data.topic, ...draft })
      .select()
      .single();
    if (error) throw new Error("تولّدات المسودة ولكن ما تسجلاتش: " + error.message);
    // Cover image: best effort — the draft stays usable without it.
    let imagePath: string | null = null;
    try {
      const { generateArticleImage } = await import("./article-ai.server");
      const b64 = await generateArticleImage(draft.title, data.topic);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      imagePath = `${row.id}.jpg`;
      const { error: upErr } = await context.supabase.storage
        .from("article-images")
        .upload(imagePath, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await context.supabase.from("article_drafts").update({ image_path: imagePath }).eq("id", row.id);
      if (updErr) throw updErr;
    } catch {
      imagePath = null;
    }
    return { ...row, image_path: imagePath };
  });

/** Public: temporary links for article cover images (private bucket). */
export const getArticleImageUrls = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ paths: z.array(z.string().min(1).max(300).regex(/^[\w./-]+$/)).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.paths.length) return { urls: {} as Record<string, string> };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("article-images")
      .createSignedUrls(data.paths, 60 * 60 * 24);
    if (error) throw new Error("تعذر تجهيز روابط الصور.");
    const urls: Record<string, string> = {};
    (signed ?? []).forEach((s, i) => {
      if (s?.signedUrl) urls[data.paths[i]!] = s.signedUrl;
    });
    return { urls };
  });

export const setDraftPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), publish: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("هاد الميزة خاصة بالمسؤولين.");
    const patch = data.publish
      ? { is_published: true, slug: `m-${data.id.slice(0, 8)}`, published_at: new Date().toISOString() }
      : { is_published: false, slug: null, published_at: null };
    const { error } = await context.supabase.from("article_drafts").update(patch).eq("id", data.id);
    if (error) throw new Error("ما تبدلاتش حالة النشر: " + error.message);
    return { ok: true };
  });
