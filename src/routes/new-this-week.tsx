import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/lib/constants";
import { whatsappUrl } from "@/lib/whatsapp";
import { JobAlertsBell, useUserCity, rememberCity } from "@/components/JobAlerts";

const T = "جديد هاد الأسبوع — وظائف المقاهي فمدينتك | قهوتي";
const D = "آخر الوظائف اللي تنشرات هاد الأسبوع فالمقاهي والمطاعم فمدينتك.";

export const Route = createFileRoute("/new-this-week")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewThisWeek,
});

function NewThisWeek() {
  const userCity = useUserCity();
  const [city, setCity] = useState("");
  useEffect(() => { if (userCity) setCity(userCity); }, [userCity]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["jobs-week", city],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      let q = supabase.from("jobs").select("*").eq("is_filled", false).gt("created_at", since).order("created_at", { ascending: false });
      if (city) q = q.eq("city", city);
      return (await q).data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <div className="flex gap-2"><JobAlertsBell /><Link to="/jobs" className="rounded-full border px-4 py-1.5 text-sm font-bold">كل الوظائف</Link></div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">جديد هاد الأسبوع</h1>
        <select value={city} onChange={(e) => { setCity(e.target.value); if (e.target.value) rememberCity(e.target.value); }} className="rounded-full border bg-card px-4 py-2">
          <option value="">كل المدن</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-6 space-y-4">
        {isLoading && <p>...</p>}
        {!isLoading && data.length === 0 && <p className="rounded-2xl border p-8 text-center text-muted-foreground">ما تنشرات حتى وظيفة هاد الأسبوع{city ? ` فـ ${city}` : ""}.</p>}
        {data.map((j) => (
          <div key={j.id} className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-black">{j.title}</h2>
            <p className="text-sm text-muted-foreground">{j.business_name} · 📍 {j.city} · {new Date(j.created_at).toLocaleDateString("ar-MA")}</p>
            {j.description && <p className="mt-3 text-sm">{j.description}</p>}
            {j.phone && (
              <a href={whatsappUrl(j.phone, `سلام، شفت إعلان "${j.title}" في منصة قهوتي.`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">تواصل عبر واتساب</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
