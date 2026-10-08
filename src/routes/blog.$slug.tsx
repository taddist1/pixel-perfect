import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { ShareButtons } from "@/components/ShareButtons";
import { supabase } from "@/integrations/supabase/client";

type PageData =
  | { kind: "static"; article: (typeof articles)[number] }
  | { kind: "draft"; draft: { title: string; seo_description: string; content: string } };

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }): Promise<PageData> => {
    const article = articles.find((a) => a.slug === params.slug);
    if (article) return { kind: "static", article };
    const { data } = await supabase
      .from("article_drafts")
      .select("title, seo_description, content")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return { kind: "draft", draft: data };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? (loaderData.kind === "static" ? loaderData.article.title : loaderData.draft.title) : "مقال";
    const d = loaderData ? (loaderData.kind === "static" ? loaderData.article.excerpt : loaderData.draft.seo_description) : "";
    const title = `${t} — قهوتي`;
    return { meta: [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  notFoundComponent: () => (
    <main dir="rtl" className="p-10 text-center">المقال غير موجود. <Link to="/blog" className="text-primary">رجوع للمدونة</Link></main>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const data = Route.useLoaderData();
  const title = data.kind === "static" ? data.article.title : data.draft.title;
  const excerpt = data.kind === "static" ? data.article.excerpt : data.draft.seo_description;

  return (
    <main dir="rtl" className="notranslate mx-auto max-w-3xl px-4 py-10" translate="no">
      <Link to="/blog" className="text-sm text-muted-foreground">← المدونة</Link>
      <h1 className="mt-4 text-3xl font-black leading-tight">{title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{excerpt}</p>
      <div className="mt-4"><ShareButtons text={title} /></div>
      <article className="mt-8 space-y-6">
        {data.kind === "static"
          ? data.article.sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-xl font-black text-primary">{s.h}</h2>
                <p className="mt-2 leading-8">{s.p}</p>
              </section>
            ))
          : data.draft.content.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-wrap leading-8">{p}</p>
            ))}
      </article>
      <div className="mt-10 rounded-2xl bg-primary p-6 text-primary-foreground">
        <p className="font-black">واش كتقلب على خدمة ولا على موظفين؟</p>
        <div className="mt-3 flex gap-2">
          <Link to="/jobs" className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">الوظائف</Link>
          <Link to="/seekers" className="rounded-full bg-background px-4 py-1.5 text-sm font-bold text-foreground">الكفاءات</Link>
        </div>
      </div>
      <div className="mt-6"><ShareButtons text={title} /></div>
    </main>
  );
}
