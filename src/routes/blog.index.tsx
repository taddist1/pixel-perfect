import { createFileRoute, Link } from "@tanstack/react-router";
import { articles } from "@/lib/articles";

const T = "مدونة قهوتي — نصائح لعالم المقاهي والمطاعم";
const D = "مقالات عملية بالعربية: كيفاش تولي باريستا، صيانة آلات القهوة، وفتح مقهى ناجح في المغرب.";

export const Route = createFileRoute("/blog/")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Blog,
});

function Blog() {
  return (
    <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← الرئيسية</Link>
      <h1 className="mt-4 text-3xl font-black">مدونة قهوتي</h1>
      <p className="mt-2 text-muted-foreground">نصائح ودلائل لكل من يشتغل في المقاهي والمطاعم.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
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
