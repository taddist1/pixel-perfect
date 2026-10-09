import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/lib/constants";
import { whatsappUrl } from "@/lib/whatsapp";
import { JobAlertsBell } from "@/components/JobAlerts";

const T = "وظائف المقاهي والمطاعم في المغرب — قهوتي";
const D = "تصفح آخر عروض العمل للبارستا، النادل والطباخ في مدينتك.";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Jobs,
});

function Jobs() {
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [schedule, setSchedule] = useState("");

  // مدينة الزائر كتكون هي الأولى
  useEffect(() => {
    const saved = localStorage.getItem("qahwati_city");
    if (saved && cities.includes(saved)) setCity(saved);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", city],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*").eq("is_filled", false).order("created_at", { ascending: false }).limit(100);
      if (city) q = q.eq("city", city);
      const { data } = await q;
      return data ?? [];
    },
  });

  const term = search.trim();
  const filtered = (data ?? []).filter((j) =>
    (!term || [j.title, j.role, j.business_name, j.description ?? ""].join(" ").includes(term))
    && (!role || j.role === role)
    && (!schedule || j.schedule === schedule)
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link to="/" translate="no" className="notranslate text-2xl font-black text-primary">قهوتي</Link>
        <div className="flex gap-2">
          <JobAlertsBell />
          <Link to="/new-this-week" className="rounded-full border px-4 py-1.5 text-sm font-bold">جديد هاد الأسبوع</Link>
          <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
        </div>
      </div>
      {city && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-secondary/60 px-5 py-3">
          <p className="text-sm font-bold">📍 كتشوف الوظائف ديال مدينتك: {city}</p>
          <button onClick={() => setCity("")} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
            وسّع البحث لكل المدن
          </button>
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">الوظائف المتاحة</h1>
        <div className="flex flex-wrap gap-2">
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border bg-card px-4 py-2">
            <option value="">كل المدن</option>{cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-full border bg-card px-4 py-2">
            <option value="">كل المهن</option>
            {["باريستا", "نادل", "طباخ", "تقني آلات القهوة", "مهن مساندة"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="rounded-full border bg-card px-4 py-2">
            <option value="">كل الأنظمة</option>
            {["دوام كامل", "دوام جزئي", "ورديات"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 ابحث: باريستا، نادل، طباخ…"
        className="mt-4 w-full rounded-full border bg-card px-5 py-2.5 text-sm"
      />
      <div className="mt-6 space-y-4">
        {isLoading && <p>...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border p-8 text-center text-muted-foreground">
            <p>لا توجد وظائف مطابقة حالياً{city ? ` في ${city}` : ""}. كن أول من ينشر!</p>
            {city && (
              <button onClick={() => setCity("")} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
                وسّع البحث لكل المدن
              </button>
            )}
          </div>
        )}
        {filtered.map((j) => (
          <div key={j.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-black">{j.title}</h2>
                <p className="text-sm text-muted-foreground">{j.business_name} · 📍 {j.city}</p>
              </div>
              <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-bold">{j.role} · {j.schedule}</span>
            </div>
            {j.description && <p className="mt-3 text-sm">{j.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-bold">
              {j.salary && <span>💰 {j.salary}</span>}
              {j.phone && (
                <>
                  <a href={`tel:${j.phone}`} className="text-primary underline" dir="ltr">{j.phone}</a>
                  <a
                    href={whatsappUrl(j.phone, `سلام، شفت إعلان "${j.title}" في منصة قهوتي وبغيت نقدم ترشيحي.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground"
                  >
                    تواصل عبر واتساب
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
