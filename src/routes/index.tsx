import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

const T = "قهوتي — منصة توظيف وخدمات المقاهي والمطاعم في المغرب";
const D = "اعثر على بارستا، نادل أو تقني إصلاح آلات القهوة في مدينتك. تسجيل مجاني 100% في كل مدن المغرب.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: T },
      { name: "description", content: D },
      { property: "og:title", content: T },
      { property: "og:description", content: D },
    ],
  }),
  component: Index,
});

const cities = ["الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة", "تطوان", "العيون"];
const roles = [
  { t: "تقني آلات القهوة", d: "إصلاح وصيانة عاجلة قريبة منك", n: 48 },
  { t: "بارستا", d: "دوام كامل، جزئي أو ورديات", n: 132 },
  { t: "سرباي / نادل", d: "عمّال خدمة بسمعة موثّقة", n: 210 },
  { t: "مهن مساندة", d: "تحميص، نظافة، توصيل، حراسة", n: 87 },
];

function Index() {
  const [city, setCity] = useState(cities[0]);
  const [lang, setLang] = useState<"ar" | "fr">("ar");
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="text-2xl font-black text-primary">قهوتي</span>
        <div className="flex items-center gap-3">
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
            <div className="mt-1 text-sm text-muted-foreground">فرص قريبة منك وتقييم يبني سمعتك</div>
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
                <div className="text-4xl font-black text-accent">{r.n}</div>
                <div className="mt-3 text-lg font-bold">{r.t}</div>
                <div className="text-sm opacity-75">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-3">
        {[["مجاني 100%", "لا رسوم على التسجيل أو التوثيق أو التقديم."],
          ["مشاريع موثّقة", "كل إعلان يُراجع قبل النشر بشارة توثيق."],
          ["12 جهة · 75 إقليم", "من الدار البيضاء إلى أصغر مدينة مغربية."]].map(([a, b]) => (
          <div key={a}><h3 className="text-xl font-black text-primary">{a}</h3><p className="mt-2 text-muted-foreground">{b}</p></div>
        ))}
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© 2026 قهوتي — المغرب</footer>
    </div>
  );
}
