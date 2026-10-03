import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { articles } from "@/lib/articles";
import { supabase } from "@/integrations/supabase/client";

const T = "مدونة قهوتي — نصائح لعالم المقاهي والمطاعم";
const D = "مقالات عملية بالعربية: كيفاش تولي باريستا، صيانة آلات القهوة، وفتح مقهى ناجح في المغرب.";

export const Route = createFileRoute("/blog/")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Blog,
});

function Blog() {
  const published = useQuery({
    queryKey: ["published-drafts"],
    queryFn: async () =>
      (await supabase.from("article_drafts").select("id, slug, title, seo_description, published_at").eq("is_published", true).order("published_at", { ascending: false })).data ?? [],
  });

  return (
    <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← الرئيسية</Link>
      <h1 className="mt-4 text-3xl font-black">مدونة قهوتي</h1>
      <p className="mt-2 text-muted-foreground">نصائح ودلائل لكل من يشتغل في المقاهي والمطاعم.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {published.data?.map((d) => (
          <Link key={d.id} to="/blog/$slug" params={{ slug: d.slug! }} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">جديد</span>
            <h2 className="mt-2 text-lg font-black">{d.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{d.seo_description}</p>
            <span className="mt-3 inline-block text-sm font-bold text-accent">اقرأ المقال ←</span>
          </Link>
        ))}
        {articles.map((a) => (
          <Link key={a.slug} to="/blog/$slug" params={{ slug: a.slug }} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
            <h2 className="text-lg font-black">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
            <span className="mt-3 inline-block text-sm font-bold text-accent">اقرأ المقال ←</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
