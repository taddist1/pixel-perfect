import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { ShareButtons } from "@/components/ShareButtons";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = articles.find((a) => a.slug === params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    const t = a ? `${a.title} — قهوتي` : "مقال — قهوتي";
    const d = a?.excerpt ?? "";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  notFoundComponent: () => (
    <main dir="rtl" className="p-10 text-center">المقال غير موجود. <Link to="/blog" className="text-primary">رجوع للمدونة</Link></main>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/blog" className="text-sm text-muted-foreground">← المدونة</Link>
      <h1 className="mt-4 text-3xl font-black leading-tight">{article.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{article.excerpt}</p>
      <div className="mt-4"><ShareButtons text={article.title} /></div>
      <article className="mt-8 space-y-6">
        {article.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-black text-primary">{s.h}</h2>
            <p className="mt-2 leading-8">{s.p}</p>
          </section>
        ))}
      </article>
      <div className="mt-10 rounded-2xl bg-primary p-6 text-primary-foreground">
        <p className="font-black">واش كتقلب على خدمة ولا على موظفين؟</p>
        <div className="mt-3 flex gap-2">
          <Link to="/jobs" className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">الوظائف</Link>
          <Link to="/seekers" className="rounded-full bg-background px-4 py-1.5 text-sm font-bold text-foreground">الكفاءات</Link>
        </div>
      </div>
      <div className="mt-6"><ShareButtons text={article.title} /></div>
    </main>
  );
}
