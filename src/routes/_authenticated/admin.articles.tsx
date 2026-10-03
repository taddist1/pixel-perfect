import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateDraft, setDraftPublished } from "@/lib/articles.functions";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  head: () => ({ meta: [{ title: "مولّد المقالات — إدارة قهوتي" }, { name: "description", content: "أداة داخلية لتوليد مسودات مقالات بالدارجة." }, { name: "robots", content: "noindex" }, { property: "og:title", content: "مولّد المقالات — إدارة قهوتي" }, { property: "og:description", content: "أداة داخلية لتوليد مسودات مقالات بالدارجة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminArticles,
});

function AdminArticles() {
  const qc = useQueryClient();
  const gen = useServerFn(generateDraft);
  const pub = useServerFn(setDraftPublished);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });
  const drafts = useQuery({
    queryKey: ["drafts"],
    enabled: role.data === true,
    queryFn: async () => (await supabase.from("article_drafts").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  if (role.isLoading) return <main dir="rtl" className="p-10 text-center">جاري التحقق...</main>;
  if (!role.data) return <main dir="rtl" className="p-10 text-center">هاد الصفحة خاصة بمسؤولي الموقع. <Link to="/" className="text-primary">الرئيسية</Link></main>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const row = await gen({ data: { topic } });
      setTopic(""); setOpenId(row.id);
      qc.invalidateQueries({ queryKey: ["drafts"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "وقع خطأ");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("article_drafts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["drafts"] });
  };

  const togglePublish = async (id: string, publish: boolean) => {
    setErr("");
    try {
      await pub({ data: { id, publish } });
      qc.invalidateQueries({ queryKey: ["drafts"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "وقع خطأ");
    }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← الرئيسية</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">مولّد المقالات</h1>
        <Link to="/admin/videos" className="rounded-md border border-border px-4 py-2 text-sm font-bold">إدارة الفيديوهات</Link>
      </div>
      <p className="mt-1 text-muted-foreground">كتب موضوع المقال، والذكاء الاصطناعي غادي يكتب مسودة بالدارجة مع عنوان ووصف SEO.</p>

      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="مثال: أحسن طريقة لتنظيف طاحونة القهوة" className="w-full rounded-xl border border-input bg-background p-3" />
        {err && <p className="text-sm font-bold text-destructive">{err}</p>}
        <button disabled={busy || topic.trim().length < 5} className="rounded-full bg-primary px-6 py-2 font-black text-primary-foreground disabled:opacity-50">
          {busy ? "جاري الكتابة... (حتى دقيقة)" : "ولّد المسودة"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-black">المسودات</h2>
      <div className="mt-4 space-y-3">
        {drafts.data?.length === 0 && <p className="text-muted-foreground">ما كاين حتى مسودة.</p>}
        {drafts.data?.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
            <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="w-full text-right">
              <h3 className="text-lg font-black">{d.title}</h3>
              <p className="text-xs text-muted-foreground">
                الموضوع: {d.topic}
                {d.is_published && <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">منشور ✓</span>}
              </p>
            </button>
            {openId === d.id && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <p><b>عنوان SEO:</b> {d.seo_title}</p>
                  <p className="mt-1"><b>وصف SEO:</b> {d.seo_description}</p>
                </div>
                <div className="whitespace-pre-wrap leading-8">{d.content}</div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(`${d.title}\n\n${d.content}`)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold">نسخ</button>
                  <button onClick={() => remove(d.id)} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">حذف</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
