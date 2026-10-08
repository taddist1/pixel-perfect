import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { criteria, trustScore, type CriterionKey } from "@/lib/trust";

const T = "إدارة التقييمات والثقة — قهوتي";
const D = "مراجعة التقييمات والردود ومؤشرات الثقة ديال الكفاءات.";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { name: "robots", content: "noindex" },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Moderation,
});

type Review = { id: string; seeker_id: string; author_name: string; rating: number; comment: string; reply: string | null; is_hidden: boolean; created_at: string } & Record<CriterionKey, number | null>;
type Seeker = { id: string; full_name: string | null; city: string | null; phone: string | null; avatar_url: string | null; profession: string | null; experience_years: number | null; skills: string[] | null };
type Stats = { total: number; answered: number; accepted: number };

function Moderation() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"reviews" | "trust">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [adj, setAdj] = useState<Record<string, { adjustment: number; note: string }>>({});

  async function load() {
    const [r, s, st, a] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("public_seekers").select("id,full_name,city,phone,avatar_url,profession,experience_years,skills"),
      supabase.rpc("seeker_trust_stats"),
      supabase.from("trust_adjustments").select("*"),
    ]);
    setReviews((r.data ?? []) as Review[]);
    setSeekers(((s.data ?? []) as Seeker[]).filter((x) => x.id));
    const so: Record<string, Stats> = {}; for (const x of st.data ?? []) so[x.seeker_id] = x; setStats(so);
    const ao: Record<string, { adjustment: number; note: string }> = {}; for (const x of a.data ?? []) ao[x.seeker_id] = x; setAdj(ao);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setIsAdmin(false);
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(!!ok);
      if (ok) load();
    });
  }, []);

  if (isAdmin === null) return <p className="p-10 text-center">…</p>;
  if (!isAdmin) return <p className="p-10 text-center">هاد الصفحة خاصة بالمدير. <Link to="/" className="text-primary underline">الرئيسية</Link></p>;

  const name = (id: string) => seekers.find((s) => s.id === id)?.full_name ?? "كفاءة";
  const avgOf = (id: string) => { const rs = reviews.filter((r) => r.seeker_id === id && !r.is_hidden); return rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : null; };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <h1 className="text-3xl font-black">إدارة التقييمات والثقة</h1>
        <p className="mt-1 text-sm text-muted-foreground">عدّل، خبّي، ولا رجّع — بلا ما تمسح والو.</p>
        <div className="mt-5 flex gap-2 border-b">
          {([["reviews", `التقييمات والردود (${reviews.length})`], ["trust", `مؤشرات الثقة (${seekers.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-5 py-3 font-black ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>

        {tab === "reviews" && (
          <div className="mt-6 space-y-4">
            {reviews.length === 0 && <p className="rounded-2xl border p-10 text-center text-muted-foreground">ما كاين حتى تقييم دابا.</p>}
            {reviews.map((r) => <ReviewEditor key={r.id} r={r} seekerName={name(r.seeker_id)} onSaved={load} />)}
          </div>
        )}

        {tab === "trust" && (
          <div className="mt-6 space-y-3">
            {seekers.map((s) => <TrustEditor key={s.id} s={s} avg={avgOf(s.id)} stats={stats[s.id]} current={adj[s.id]} onSaved={load} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewEditor({ r, seekerName, onSaved }: { r: Review; seekerName: string; onSaved: () => void }) {
  const [c, setC] = useState<Record<CriterionKey, number>>({ quality: r.quality ?? r.rating, commitment: r.commitment ?? r.rating, communication: r.communication ?? r.rating, professionalism: r.professionalism ?? r.rating });
  const [comment, setComment] = useState(r.comment);
  const [reply, setReply] = useState(r.reply ?? "");
  const [msg, setMsg] = useState("");

  async function save(extra: Partial<{ is_hidden: boolean }> = {}) {
    const vals = Object.values(c);
    const { error } = await supabase.from("reviews").update({
      ...c, rating: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      comment: comment.trim(), reply: reply.trim() || null, ...extra,
    }).eq("id", r.id);
    setMsg(error ? "وقع خطأ" : "تحفظ ✓");
    if (!error) onSaved();
  }

  return (
    <div className={`rounded-2xl border bg-card p-5 ${r.is_hidden ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black">{r.author_name} ← {seekerName}</p>
        <span className="text-xs">{r.is_hidden ? "🙈 مخبّي على العموم" : "👁 ظاهر"} · {new Date(r.created_at).toLocaleDateString("ar-MA")}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {criteria.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold">
            {label}
            <select value={c[k]} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })} className="bg-card text-accent">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder="التعليق" className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={500} placeholder="رد الكفاءة (خليه خاوي باش يتحيد)" className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => save()} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">حفظ التعديل</button>
        <button onClick={() => save({ is_hidden: !r.is_hidden })} className="rounded-full border px-5 py-2 text-sm font-bold">{r.is_hidden ? "رجّعو ظاهر" : "خبّيه"}</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}

function TrustEditor({ s, avg, stats, current, onSaved }: { s: Seeker; avg: number | null; stats?: Stats | undefined; current?: { adjustment: number; note: string } | undefined; onSaved: () => void }) {
  const [a, setA] = useState(current?.adjustment ?? 0);
  const [note, setNote] = useState(current?.note ?? "");
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = trustScore({ profile: s, ratingAvg: avg, stats });
  const final = trustScore({ profile: s, ratingAvg: avg, stats, adjustment: a });

  async function save() {
    const { error } = await supabase.from("trust_adjustments").upsert({ seeker_id: s.id, adjustment: a, note: note.trim(), updated_at: new Date().toISOString() });
    setMsg(error ? "وقع خطأ" : "تحفظ ✓");
    if (!error) onSaved();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("profiles").delete().eq("id", s.id);
    setBusy(false);
    if (error) { setMsg("وقع خطأ فالحذف"); return; }
    onSaved();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
      <div className="min-w-40 flex-1">
        <p className="font-black">{s.full_name ?? "بدون اسم"}</p>
        <p className="text-xs text-muted-foreground">{s.profession ?? "—"} · {s.city ?? "—"} · المحسوب: {base.score}</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        تعديل
        <input type="number" min={-50} max={50} value={a} onChange={(e) => setA(Math.max(-50, Math.min(50, Number(e.target.value) || 0)))} className="w-20 rounded-lg border bg-background px-2 py-1" />
      </label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="السبب (اختياري)" className="min-w-40 flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm" />
      <span className="font-black text-primary">{final.icon} {final.score}</span>
      <button onClick={save} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">حفظ</button>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="rounded-full border border-accent px-4 py-1.5 text-sm font-bold text-accent">🗑 حذف</button>
      ) : (
        <span className="flex items-center gap-2 text-sm font-bold text-accent">
          متأكد؟
          <button disabled={busy} onClick={remove} className="rounded-full bg-accent px-3 py-1 text-white disabled:opacity-50">{busy ? "…" : "نعم، احذف"}</button>
          <button onClick={() => setConfirming(false)} className="rounded-full border px-3 py-1">إلغاء</button>
        </span>
      )}
      {msg && <span className="text-xs">{msg}</span>}
    </div>
  );
}
