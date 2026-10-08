import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/whatsapp";
import { flushPush } from "@/lib/push.functions";
import { trustScore } from "@/lib/trust";

const T = "الكفاءات المتاحة — قهوتي";
const D = "تصفح الباحثين عن عمل في قطاع المقاهي والمطاعم حسب المدينة والخبرة والمهارات: بارستا، ندلاء، تقنيو آلات القهوة ومهن مساندة.";

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
const skillOptions = ["لاتيه آرت", "V60", "كيمكس", "كولد برو", "قهوة مختصة", "صيانة الآلات", "خدمة الطاولات"];

type Seeker = {
  id: string;
  full_name: string | null;
  city: string | null;
  profession: string | null;
  experience_years: number | null;
  avatar_url: string | null;
  phone: string | null;
  is_available: boolean | null;
  skills: string[] | null;
};

function Seekers() {
  const [city, setCity] = useState("الكل");
  const [search, setSearch] = useState("");
  const [exp, setExp] = useState("");
  const [avail, setAvail] = useState("");
  const [skill, setSkill] = useState("");
  const [rows, setRows] = useState<Seeker[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; n: number }>>({});
  const [adjs, setAdjs] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, { total: number; answered: number; accepted: number }>>({});
  const [loading, setLoading] = useState(true);

  // المدينة المحفوظة ديال الزائر كتكون هي الأولى
  useEffect(() => {
    const saved = localStorage.getItem("qahwati_city");
    if (saved && cities.includes(saved)) setCity(saved);
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("public_seekers").select("*").order("created_at", { ascending: false });
    if (city !== "الكل") q = q.eq("city", city);
    q.then(({ data }) => {
      setRows((data ?? []) as Seeker[]);
      setLoading(false);
    });
    supabase.from("reviews").select("seeker_id, rating").then(({ data }) => {
      const acc: Record<string, { sum: number; n: number }> = {};
      for (const r of data ?? []) {
        acc[r.seeker_id] = { sum: (acc[r.seeker_id]?.sum ?? 0) + r.rating, n: (acc[r.seeker_id]?.n ?? 0) + 1 };
      }
      const out: Record<string, { avg: number; n: number }> = {};
      for (const [id, v] of Object.entries(acc)) out[id] = { avg: Math.round((v.sum / v.n) * 10) / 10, n: v.n };
      setRatings(out);
    });
    supabase.from("public_trust_adjustments" as never).select("seeker_id,adjustment").then(({ data }) => setAdjs(Object.fromEntries(((data ?? []) as { seeker_id: string; adjustment: number }[]).map((x) => [x.seeker_id, x.adjustment]))));
    supabase.rpc("seeker_trust_stats").then(({ data }) => {
      const o: Record<string, { total: number; answered: number; accepted: number }> = {};
      for (const r of data ?? []) o[r.seeker_id] = r;
      setStats(o);
    });
  }, [city]);

  const term = search.trim();
  const filtered = rows.filter((s) => {
    if (term && ![s.full_name ?? "", s.profession ?? "", s.city ?? "", (s.skills ?? []).join(" ")].join(" ").includes(term)) return false;
    if (avail === "yes" && !s.is_available) return false;
    if (skill && !(s.skills ?? []).includes(skill)) return false;
    if (exp) {
      const y = s.experience_years ?? 0;
      if (exp === "1" && y >= 1) return false;
      if (exp === "2" && (y < 1 || y > 3)) return false;
      if (exp === "3" && (y < 3 || y > 6)) return false;
      if (exp === "4" && y < 6) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <h1 className="text-3xl font-black md:text-4xl">الكفاءات المتاحة</h1>
        <p className="mt-2 text-muted-foreground">باحثون عن عمل في قطاع المقاهي والمطاعم. تواصل معهم مباشرة عبر واتساب.</p>

        {city !== "الكل" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-secondary/60 px-5 py-3">
            <p className="text-sm font-bold">📍 كتشوف الكفاءات ديال مدينتك: {city}</p>
            <button onClick={() => setCity("الكل")} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
              وسّع البحث لكل المدن
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm font-bold">
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={exp} onChange={(e) => setExp(e.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm font-bold">
            <option value="">أي خبرة</option>
            <option value="1">أقل من سنة</option>
            <option value="2">1–3 سنوات</option>
            <option value="3">3–6 سنوات</option>
            <option value="4">+6 سنوات</option>
          </select>
          <select value={avail} onChange={(e) => setAvail(e.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm font-bold">
            <option value="">كل التوفر</option>
            <option value="yes">متاح الآن 🟢</option>
          </select>
          <select value={skill} onChange={(e) => setSkill(e.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm font-bold">
            <option value="">كل المهارات</option>
            {skillOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث بالاسم أو المهنة…"
            className="min-w-48 flex-1 rounded-full border bg-card px-5 py-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="mt-10 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border p-10 text-center text-muted-foreground">
            <p>لا توجد كفاءات مطابقة حالياً{city !== "الكل" ? ` في ${city}` : ""}. كن أول من يسجل!</p>
            {city !== "الكل" && (
              <button onClick={() => setCity("الكل")} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
                وسّع البحث لكل المدن
              </button>
            )}
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
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  {s.is_available && <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">🟢 متاح الآن</span>}
                  {s.city && <span className="rounded-full bg-accent/20 px-3 py-1">📍 {s.city}</span>}
                  {s.experience_years != null && (
                    <span className="rounded-full bg-accent/20 px-3 py-1">خبرة {s.experience_years} سنة</span>
                  )}
                  {ratings[s.id] != null && (
                    <span className="rounded-full bg-accent/20 px-3 py-1">★ {ratings[s.id]!.avg} ({ratings[s.id]!.n})</span>
                  )}
                  {(() => { const t = trustScore({ profile: s, ratingAvg: ratings[s.id]?.avg, stats: stats[s.id], adjustment: adjs[s.id] }); return (
                    <span className="rounded-full border border-primary/40 px-3 py-1 text-primary" title="مؤشر الثقة">{t.icon} {t.label} · {t.score}</span>
                  ); })()}
                  {(s.skills ?? []).map((sk) => <span key={sk} className="rounded-full bg-secondary px-3 py-1">{sk}</span>)}
                </div>
                <RequestButton seeker={s} />
                {s.phone && (
                  <a
                    href={whatsappUrl(s.phone, `سلام ${s.full_name ?? ""}، شفت ملفك في منصة قهوتي وعندي فرصة عمل ليك.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block rounded-full border px-4 py-2 text-center text-sm font-bold"
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

function RequestButton({ seeker }: { seeker: Seeker }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true); setMsg("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setBusy(false); return setMsg("سجّل الدخول بحساب صاحب مشروع باش تصيفط طلب."); }
    const { data: me } = await supabase.from("profiles").select("full_name,account_type").eq("id", data.user.id).maybeSingle();
    if (me?.account_type !== "owner") { setBusy(false); return setMsg("الطلبات خاصة بأصحاب المشاريع فقط."); }
    if (data.user.id === seeker.id) { setBusy(false); return setMsg("ما يمكنش تصيفط طلب لراسك."); }
    const { error } = await supabase.from("job_requests").insert({ seeker_id: seeker.id, owner_id: data.user.id, owner_name: me.full_name ?? "", message: text.trim() });
    setBusy(false);
    if (error) return setMsg("وقع خطأ، حاول مرة أخرى");
    flushPush().catch(() => {});
    setText(""); setOpen(false); setMsg("✅ تصيفط الطلب — غادي يوصلك إشعار ملي يرد.");
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="block w-full rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">📩 أرسل طلب عمل</button>
      ) : (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3}
            placeholder={`سلام ${seeker.full_name ?? ""}، عندي فرصة عمل فـ…`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button disabled={busy || !text.trim()} onClick={send} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "…" : "إرسال"}</button>
            <button onClick={() => setOpen(false)} className="rounded-full border px-4 py-2 text-sm font-bold">إلغاء</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-xs">{msg}</p>}
    </div>
  );
}
