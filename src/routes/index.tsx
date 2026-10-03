import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { youtubeThumbnail } from "@/lib/youtube";
import type { Tables } from "@/integrations/supabase/types";

const T = "قهوتي — منصة توظيف وخدمات المقاهي والمطاعم في المغرب";
const D = "اعثر على بارستا، نادل أو تقني إصلاح آلات القهوة في مدينتك. تسجيل مجاني 100% في كل مدن المغرب.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: T },
      { name: "description", content: D },
      { property: "og:title", content: T },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const cities = ["الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة", "تطوان", "العيون"];
const roles = [
  { t: "تقني آلات القهوة", d: "إصلاح وصيانة عاجلة قريبة منك", match: "تقني" },
  { t: "بارستا", d: "دوام كامل، جزئي أو ورديات", match: "باريستا" },
  { t: "سرباي / نادل", d: "عمّال خدمة بسمعة موثّقة", match: "نادل" },
  { t: "مهن مساندة", d: "تحميص، نظافة، توصيل، حراسة", match: "" },
];

function Index() {
  const [city, setCity] = useState(cities[0]);
  const [lang, setLang] = useState<"ar" | "fr">("ar");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [jobsCount, setJobsCount] = useState(0);
  const [videos, setVideos] = useState<Tables<"educational_videos">[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("public_seekers").select("profession").then(({ data }) => {
      const c: Record<string, number> = {};
      for (const r of data ?? []) {
        const p = (r.profession ?? "").trim();
        if (p) c[p] = (c[p] ?? 0) + 1;
      }
      setCounts(c);
    });
    supabase.from("jobs").select("id", { count: "exact", head: true }).then(({ count }) => {
      setJobsCount(count ?? 0);
    });
    supabase.from("educational_videos").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(3).then(({ data }) => {
      setVideos(data ?? []);
    });
  }, []);

  const totalSeekers = Object.values(counts).reduce((a, b) => a + b, 0);
  const countFor = (match: string): number => {
    if (!match) return Math.max(0, totalSeekers - roles.slice(0, 3).reduce((a, r) => a + countFor(r.match), 0));
    return Object.entries(counts).filter(([p]) => p.includes(match)).reduce((a, [, n]) => a + n, 0);
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="text-2xl font-black text-primary">قهوتي</span>
        <div className="flex items-center gap-3">
          <Link to="/videos" className="rounded-full border border-border px-4 py-1.5 text-sm font-bold">الفيديوهات</Link>
          <Link to="/blog" className="rounded-full border border-border px-4 py-1.5 text-sm font-bold">المدونة</Link>
          <Link to="/account" className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">حسابي</Link>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="rounded-full border bg-card px-3 py-1.5 text-sm">
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
            className="rounded-full border px-3 py-1.5 text-sm font-bold">{lang === "ar" ? "FR" : "ع"}</button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <p className="mb-4 inline-block rounded-full bg-accent/30 px-3 py-1 text-sm font-bold">📍 {city}</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
          عامل مقهاك أو تقنيّك، <span className="text-accent">في دقائق</span>.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">{D}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:max-w-2xl">
          <Link to="/post-job" className="rounded-2xl bg-primary p-6 text-right text-primary-foreground transition hover:-translate-y-1">
            <div className="text-xl font-black">أنا صاحب مشروع</div>
            <div className="mt-1 text-sm opacity-80">أنشر وظيفة أو اطلب تقني إصلاح</div>
          </Link>
          <Link to="/jobs" className="rounded-2xl border-2 border-primary bg-card p-6 text-right transition hover:-translate-y-1">
            <div className="text-xl font-black">أبحث عن عمل</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {jobsCount > 0 ? `${jobsCount} وظيفة منشورة الآن` : "فرص قريبة منك وتقييم يبني سمعتك"}
            </div>
          </Link>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-3xl font-black">الكفاءات المتاحة في {city}</h2>
            <Link to="/seekers" className="rounded-full bg-accent px-5 py-2 text-sm font-black text-accent-foreground">تصفح الكفاءات ←</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <div key={r.t} className="rounded-2xl border border-primary-foreground/20 p-5">
                <div className="text-4xl font-black text-primary-foreground">{countFor(r.match)}</div>
                <div className="mt-3 text-lg font-bold">{r.t}</div>
                <div className="text-sm opacity-75">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-accent">تعلّم من المحترفين</p>
              <h2 className="mt-1 text-3xl font-black">فيديوهات تعليمية</h2>
              <p className="mt-2 text-muted-foreground">نصائح عملية في القهوة، الصيانة وتسيير المقاهي.</p>
            </div>
            <Link to="/videos" className="font-black text-primary">شوف مكتبة الفيديوهات ←</Link>
          </div>
          {videos.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Link key={video.id} to="/videos" className="group overflow-hidden rounded-lg border border-border bg-card">
                  <div className="relative aspect-video overflow-hidden bg-secondary">
                    <img src={youtubeThumbnail(video.youtube_id)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                    <span className="absolute inset-0 grid place-items-center bg-foreground/15"><span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><Play className="size-5 fill-current" aria-hidden="true" /></span></span>
                  </div>
                  <div className="p-4"><span className="text-xs font-bold text-primary">{video.category}</span><h3 className="mt-1 line-clamp-2 font-black">{video.title}</h3></div>
                </Link>
              ))}
            </div>
          ) : (
            <Link to="/videos" className="mt-7 flex min-h-40 items-center justify-center rounded-lg border border-dashed border-primary bg-card px-5 text-center font-bold text-primary">قريباً: أول فيديوهات قهوتي التعليمية</Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-3">
        {[["مجاني 100%", "لا رسوم على التسجيل أو التوثيق أو التقديم."],
          ["تواصل مباشر", "زر واتساب على كل وظيفة وكل كفاءة — بلا وسيط."],
          ["12 جهة · 75 إقليم", "من الدار البيضاء إلى أصغر مدينة مغربية."]].map(([a, b]) => (
          <div key={a}><h3 className="text-xl font-black text-primary">{a}</h3><p className="mt-2 text-muted-foreground">{b}</p></div>
        ))}
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© 2026 قهوتي — المغرب</footer>
    </div>
  );
}
