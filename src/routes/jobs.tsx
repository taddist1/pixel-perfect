import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/lib/constants";

const T = "وظائف المقاهي والمطاعم في المغرب — قهوتي";
const D = "تصفح آخر عروض العمل للبارستا، النادل والطباخ في مدينتك.";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }] }),
  component: Jobs,
});

function Jobs() {
  const [city, setCity] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", city],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(100);
      if (city) q = q.eq("city", city);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">الوظائف المتاحة</h1>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border bg-card px-4 py-2">
          <option value="">كل المدن</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-6 space-y-4">
        {isLoading && <p>...</p>}
        {data?.length === 0 && <p className="rounded-2xl border p-8 text-center text-muted-foreground">لا توجد وظائف حالياً. كن أول من ينشر!</p>}
        {data?.map((j) => (
          <div key={j.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-black">{j.title}</h2>
                <p className="text-sm text-muted-foreground">{j.business_name} · 📍 {j.city}</p>
              </div>
              <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-bold">{j.role} · {j.schedule}</span>
            </div>
            {j.description && <p className="mt-3 text-sm">{j.description}</p>}
            <div className="mt-3 flex gap-4 text-sm font-bold">
              {j.salary && <span>💰 {j.salary}</span>}
              {j.phone && <a href={`tel:${j.phone}`} className="text-primary underline" dir="ltr">{j.phone}</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
