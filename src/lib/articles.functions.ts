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
    return row;
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
