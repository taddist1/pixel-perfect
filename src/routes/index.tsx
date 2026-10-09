import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, BriefcaseBusiness, ChevronLeft, Coffee, MapPin, Menu, Play, UserRoundSearch, Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { youtubeThumbnail } from "@/lib/youtube";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/qahwati-barista-hero.jpg";

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
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [jobsCount, setJobsCount] = useState(0);
  const [videos, setVideos] = useState<Tables<"educational_videos">[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
        setIsAdmin((data?.length ?? 0) > 0);
      });
    });
  }, []);

  const totalSeekers = Object.values(counts).reduce((a, b) => a + b, 0);
  const countFor = (match: string): number => {
    if (!match) return Math.max(0, totalSeekers - roles.slice(0, 3).reduce((a, r) => a + countFor(r.match), 0));
    return Object.entries(counts).filter(([p]) => p.includes(match)).reduce((a, [, n]) => a + n, 0);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="relative z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="قهوتي — الرئيسية">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-xl font-black text-primary-foreground">ق</span>
            <span translate="no" className="notranslate text-2xl font-black text-foreground">قهوتي<span className="text-accent">.</span></span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            <Link to="/jobs" className="px-3 py-2 text-sm font-bold hover:text-primary">الوظائف</Link>
            <Link to="/seekers" className="px-3 py-2 text-sm font-bold hover:text-primary">الكفاءات</Link>
            <Link to="/videos" className="px-3 py-2 text-sm font-bold hover:text-primary">التكوين</Link>
            <Link to="/blog" className="px-3 py-2 text-sm font-bold hover:text-primary">المدونة</Link>
          {isAdmin && (
            <>
                <Link to="/admin/videos" className="px-3 py-2 text-sm font-bold text-accent">إدارة الفيديوهات</Link>
                <Link to="/admin/articles" className="px-3 py-2 text-sm font-bold text-accent">مولّد المقالات</Link>
            </>
          )}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <select aria-label="اختر المدينة" value={city} onChange={(e) => { setCity(e.target.value); localStorage.setItem("qahwati_city", e.target.value); }}
              className="h-10 rounded-md border bg-card px-3 text-sm font-semibold">
            {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Button asChild><Link to="/account">حسابي</Link></Button>
          </div>
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="absolute inset-x-0 top-full border-b border-border bg-card p-4 shadow-xl lg:hidden" aria-label="قائمة الهاتف">
            <div className="mx-auto grid max-w-md gap-1">
              <Link to="/jobs" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-bold hover:bg-secondary">الوظائف</Link>
              <Link to="/seekers" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-bold hover:bg-secondary">الكفاءات</Link>
              <Link to="/videos" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-bold hover:bg-secondary">الفيديوهات</Link>
              <Link to="/blog" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-bold hover:bg-secondary">المدونة</Link>
              <Link to="/account" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-bold hover:bg-secondary">حسابي</Link>
              <select aria-label="اختر المدينة" value={city} onChange={(e) => { setCity(e.target.value); localStorage.setItem("qahwati_city", e.target.value); }} className="mt-2 h-11 rounded-md border bg-card px-3 text-sm font-semibold">
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </nav>
        )}
      </header>

      <section className="relative min-h-[600px] overflow-hidden bg-surface-strong lg:min-h-[650px]">
        <img src={heroImage} alt="بارستا مغربي يحضّر القهوة في مقهى عصري" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-[36%_center] lg:object-center" />
        <div className="absolute inset-0 bg-surface-strong/75 lg:bg-surface-strong/65" />
        <div className="relative mx-auto flex min-h-[600px] max-w-7xl items-center px-5 py-16 lg:min-h-[650px] lg:px-8">
          <div className="qahwati-rise max-w-2xl text-primary-foreground">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-primary-foreground/25 bg-surface-strong/50 px-3 py-2 text-xs font-bold">
              <MapPin className="size-4 text-accent" /> فرص وخبرات من {city}
            </div>
            <h1 className="text-4xl font-black leading-[1.25] md:text-6xl lg:text-7xl">بوابتك المهنية إلى عالم <span className="text-accent">المقاهي</span></h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-primary-foreground/85 md:text-xl">منصة مغربية متخصصة تجمع أصحاب المقاهي والمطاعم بالكفاءات والخبرات والتعلّم المهني.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-accent px-7 font-bold text-accent-foreground hover:bg-accent/90"><Link to="/post-job"><BriefcaseBusiness /> أنشر فرصة عمل</Link></Button>
              <Button asChild size="lg" variant="secondary" className="h-12 px-7 font-bold"><Link to="/jobs"><UserRoundSearch /> تصفح الفرص</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-5xl px-5">
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {[[totalSeekers, "كفاءة مسجلة"], [jobsCount, "فرصة متاحة"], [cities.length, "مدن رئيسية"]].map(([number, label], index) => (
            <div key={label} className={`px-2 py-5 text-center ${index < 2 ? "border-l border-border" : ""}`}>
              <div className={`text-2xl font-black md:text-3xl ${index === 1 ? "text-accent" : "text-primary"}`}>{number}</div>
              <div className="mt-1 text-[11px] font-semibold text-muted-foreground md:text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-20 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-accent">كل ما يحتاجه القطاع</p><h2 className="mt-2 text-3xl font-black">استكشف خدمات <span translate="no" className="notranslate">قهوتي</span></h2></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "فرص العمل", desc: "وظائف جديدة حسب المدينة والمهنة", to: "/jobs" as const, icon: BriefcaseBusiness, tone: "bg-secondary text-primary" },
            { title: "الكفاءات", desc: "بارستا ونوادل وتقنيون موثوقون", to: "/seekers" as const, icon: UserRoundSearch, tone: "bg-surface-soft text-primary" },
            { title: "التكوين المهني", desc: "فيديوهات عملية من أهل الخبرة", to: "/videos" as const, icon: BookOpen, tone: "bg-accent/10 text-accent" },
            { title: "🚨 آلتي تعطلت الآن", desc: "أول تقني متاح فمدينتك كيجيك", to: "/emergency" as const, icon: Wrench, tone: "bg-muted text-foreground" },
          ].map((service) => (
            <Link key={service.title} to={service.to} className="group rounded-lg border border-border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <span className={`grid size-12 place-items-center rounded-lg ${service.tone}`}><service.icon className="size-6" /></span>
              <h3 className="mt-5 text-lg font-black">{service.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">استكشف <ChevronLeft className="size-4 transition group-hover:-translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-bold text-primary-foreground/70">أرقام تتحدّث مباشرة</p><h2 className="mt-2 text-3xl font-black">الكفاءات في {city}</h2></div>
            <Button asChild variant="secondary"><Link to="/seekers">تصفح الكفاءات <ChevronLeft /></Link></Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <div key={r.t} className="rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 p-5">
                <div className="text-4xl font-black text-primary-foreground">{countFor(r.match)}</div>
                <div className="mt-3 text-lg font-bold">{r.t}</div>
                <div className="text-sm opacity-75">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <h2 className="text-3xl font-black">اكتشف الفرص في مدينتك</h2>
        <p className="mt-2 text-muted-foreground">كل مدينة عندها صفحتها: وظائفها، كفاءاتها وتقييماتها.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {cities.map((c) => (
            <Link key={c} to="/cities/$city" params={{ city: c }}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-5 py-3 font-bold transition hover:border-primary hover:bg-secondary">
              <MapPin className="size-4 text-accent" /> {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted py-14">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-accent">تعلّم من المحترفين</p>
              <h2 className="mt-1 text-3xl font-black">فيديوهات تعليمية</h2>
              <p className="mt-2 text-muted-foreground">نصائح عملية في القهوة، الصيانة وتسيير المقاهي.</p>
            </div>
            <Link to="/videos" className="inline-flex items-center gap-1 font-black text-primary">شوف مكتبة الفيديوهات <ChevronLeft className="size-4" /></Link>
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
            <Link to="/videos" className="mt-7 flex min-h-40 items-center justify-center rounded-lg border border-dashed border-primary bg-card px-5 text-center font-bold text-primary"><span>قريباً: أول فيديوهات <span translate="no" className="notranslate">قهوتي</span> التعليمية</span></Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-3 lg:px-8">
        {[["مجاني 100%", "لا رسوم على التسجيل أو التوثيق أو التقديم."],
          ["تواصل مباشر", "زر واتساب على كل وظيفة وكل كفاءة — بلا وسيط."],
          ["12 جهة · 75 إقليم", "من الدار البيضاء إلى أصغر مدينة مغربية."]].map(([a, b]) => (
          <div key={a} className="border-r-4 border-accent pr-4"><h3 className="text-xl font-black text-primary">{a}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{b}</p></div>
        ))}
      </section>
      <footer className="bg-surface-strong py-10 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 text-center sm:flex-row sm:text-right lg:px-8">
          <div><div translate="no" className="notranslate flex items-center justify-center gap-2 text-2xl font-black sm:justify-start"><Coffee className="size-6" /> قهوتي<span className="text-accent">.</span></div><p className="mt-2 text-sm text-primary-foreground/65">منصة أهل المقاهي والمطاعم في المغرب.</p></div>
          <div className="flex gap-5 text-sm font-semibold"><Link to="/jobs">الوظائف</Link><Link to="/seekers">الكفاءات</Link><Link to="/blog">المدونة</Link></div>
          <p className="text-xs text-primary-foreground/55">© 2026 <span translate="no" className="notranslate">قهوتي</span> — المغرب</p>
        </div>
      </footer>
    </div>
  );
}
