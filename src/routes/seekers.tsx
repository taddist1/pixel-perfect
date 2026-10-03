import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/whatsapp";

const T = "الكفاءات المتاحة — قهوتي";
const D = "تصفح الباحثين عن عمل في قطاع المقاهي والمطاعم حسب المدينة: بارستا، ندلاء، تقنيو آلات القهوة ومهن مساندة.";

export const Route = createFileRoute("/seekers")({
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
  component: Seekers,
});

const cities = ["الكل", "الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة", "تطوان", "العيون"];

type Seeker = {
  id: string;
  full_name: string | null;
  city: string | null;
  profession: string | null;
  experience_years: number | null;
  avatar_url: string | null;
  phone: string | null;
};

function Seekers() {
  const [city, setCity] = useState("الكل");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Seeker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("public_seekers").select("*").order("created_at", { ascending: false });
    if (city !== "الكل") q = q.eq("city", city);
    q.then(({ data }) => {
      setRows((data ?? []) as Seeker[]);
      setLoading(false);
    });
  }, [city]);

  const term = search.trim();
  const filtered = rows.filter((s) =>
    !term || [s.full_name ?? "", s.profession ?? "", s.city ?? ""].join(" ").includes(term)
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <h1 className="text-3xl font-black md:text-4xl">الكفاءات المتاحة</h1>
        <p className="mt-2 text-muted-foreground">باحثون عن عمل في قطاع المقاهي والمطاعم. تواصل معهم مباشرة عبر واتساب.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm font-bold">
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث بالاسم أو المهنة…"
            className="flex-1 min-w-48 rounded-full border bg-card px-5 py-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="mt-10 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border p-10 text-center text-muted-foreground">
            لا توجد كفاءات مطابقة حالياً{city !== "الكل" ? ` في ${city}` : ""}. كن أول من يسجل!
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={s.full_name ?? ""} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/30 text-xl font-black text-primary">
                      {(s.full_name ?? "؟").trim().charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-black">{s.full_name ?? "بدون اسم"}</div>
                    <div className="text-sm text-muted-foreground">{s.profession ?? "مهنة غير محددة"}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {s.city && <span className="rounded-full bg-accent/20 px-3 py-1">📍 {s.city}</span>}
                  {s.experience_years != null && (
                    <span className="rounded-full bg-accent/20 px-3 py-1">خبرة {s.experience_years} سنة</span>
                  )}
                </div>
                {s.phone && (
                  <a
                    href={whatsappUrl(s.phone, `سلام ${s.full_name ?? ""}، شفت ملفك في منصة قهوتي وعندي فرصة عمل ليك.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block rounded-full bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground"
                  >
                    تواصل عبر واتساب
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
