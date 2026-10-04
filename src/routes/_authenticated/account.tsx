import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities, professions } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — قهوتي" }, { name: "description", content: "ملفك الشخصي في قهوتي" }] }),
  component: Account,
});

type P = { full_name: string | null; city: string | null; phone: string | null; account_type: "owner" | "seeker" | null; profession: string | null; experience_years: number | null; avatar_url: string | null; is_available: boolean; skills: string[] };

function Account() {
  const { user } = Route.useRouteContext();
  const nav = useNavigate();
  const [p, setP] = useState<P | null>(null);
  const [avatar, setAvatar] = useState<string>();
  const [msg, setMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin((data?.length ?? 0) > 0);
    });
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      const v = (data ?? { full_name: null, city: null, phone: null, account_type: null, profession: null, experience_years: null, avatar_url: null, is_available: true, skills: [] }) as P;
      setP(v);
      if (v.avatar_url) supabase.storage.from("avatars").createSignedUrl(v.avatar_url, 3600).then(({ data }) => setAvatar(data?.signedUrl));
    });
  }, [user.id]);

  async function upload(f: File) {
    const path = `${user.id}/avatar-${Date.now()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (error) return setMsg("تعذر رفع الصورة");
    setP((x) => x && { ...x, avatar_url: path });
    setAvatar(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...p, updated_at: new Date().toISOString() });
    if (error) return setMsg("وقع خطأ، حاول مرة أخرى");
    setMsg("تم الحفظ ✓");
    nav({ to: p.account_type === "owner" ? "/post-job" : "/jobs" });
  }

  if (!p) return <div className="p-10 text-center">...</div>;
  const set = (k: keyof P, v: unknown) => setP({ ...p, [k]: v });
  const input = "w-full rounded-xl border bg-card px-4 py-3";

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <div className="flex gap-3 text-sm">
          <Link to="/jobs" className="underline">الوظائف</Link>
          {p.account_type === "owner" && <Link to="/post-job" className="underline">نشر وظيفة</Link>}
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="underline">خروج</button>
        </div>
      </div>
      <h1 className="mt-8 text-3xl font-black">ملفي الشخصي</h1>
      {isAdmin && (
        <div className="mt-4 rounded-2xl border-2 border-accent bg-card p-4">
          <p className="text-sm font-black text-accent">لوحة الإدارة</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/admin/articles" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">مولّد المقالات</Link>
            <Link to="/admin/videos" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">إدارة الفيديوهات</Link>
          </div>
        </div>
      )}
      <form onSubmit={save} className="mt-6 space-y-4 rounded-3xl border bg-card p-6">
        <label className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">{avatar && <img src={avatar} alt="الصورة الشخصية" className="h-full w-full object-cover" />}</div>
          <span className="rounded-full border px-4 py-2 text-sm font-bold">تغيير الصورة</span>
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["owner", "seeker"] as const).map((t) => (
            <button type="button" key={t} onClick={() => set("account_type", t)}
              className={`rounded-xl border-2 p-4 font-bold ${p.account_type === t ? "border-primary bg-primary text-primary-foreground" : ""}`}>
              {t === "owner" ? "صاحب مشروع" : "أبحث عن عمل"}
            </button>
          ))}
        </div>
        <input className={input} placeholder="الاسم الكامل" value={p.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
        <select className={input} value={p.city ?? ""} onChange={(e) => set("city", e.target.value)}>
          <option value="">اختر المدينة</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className={input} dir="ltr" placeholder="06XXXXXXXX" value={p.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        {p.account_type === "seeker" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <select className={input} value={p.profession ?? ""} onChange={(e) => set("profession", e.target.value)}>
                <option value="">المهنة</option>{professions.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className={input} type="number" min={0} placeholder="سنوات الخبرة" value={p.experience_years ?? ""} onChange={(e) => set("experience_years", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => set("is_available", true)}
                className={`rounded-xl border-2 p-3 font-bold ${p.is_available ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                🟢 متاح الآن
              </button>
              <button type="button" onClick={() => set("is_available", false)}
                className={`rounded-xl border-2 p-3 font-bold ${!p.is_available ? "border-accent bg-accent text-accent-foreground" : ""}`}>
                ⏸ مشغول حالياً
              </button>
            </div>
            <div className="rounded-xl border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-bold">مهاراتك (اختياري)</p>
              <div className="flex flex-wrap gap-2">
                {["لاتيه آرت", "V60", "كيمكس", "كولد برو", "قهوة مختصة", "صيانة الآلات", "خدمة الطاولات"].map((s) => {
                  const on = (p.skills ?? []).includes(s);
                  return (
                    <button type="button" key={s}
                      onClick={() => set("skills", on ? (p.skills ?? []).filter((x) => x !== s) : [...(p.skills ?? []), s])}
                      className={`rounded-full border px-3 py-1 text-sm font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <button className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground">{p.account_type === "owner" ? "حفظ ونشر وظيفة ←" : "حفظ وتصفح الوظائف ←"}</button>
        {msg && <p className="text-center text-sm">{msg}</p>}
      </form>
      {p.account_type === "owner" && <MyJobs userId={user.id} />}
      {p.account_type === "seeker" && <SeekerExtras userId={user.id} p={p} avatar={avatar} />}
    </div>
  );
}

function completion(p: P) {
  const checks = [p.full_name, p.city, p.phone, p.avatar_url, p.profession, p.experience_years != null ? "x" : null, p.skills.length ? "x" : null];
  const done = checks.filter(Boolean).length;
  return { pct: Math.round((done / checks.length) * 100), missing: [
    !p.full_name && "الاسم", !p.city && "المدينة", !p.phone && "الهاتف", !p.avatar_url && "الصورة",
    !p.profession && "المهنة", p.experience_years == null && "سنوات الخبرة", !p.skills.length && "المهارات",
  ].filter(Boolean) as string[] };
}

type Review = { id: string; author_name: string; rating: number; comment: string; created_at: string };

function SeekerExtras({ userId, p, avatar }: { userId: string; p: P; avatar?: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    supabase.from("reviews").select("id,author_name,rating,comment,created_at").eq("seeker_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [userId]);
  const { pct, missing } = completion(p);
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-3xl border bg-card p-6">
        <div className="flex items-center justify-between"><h2 className="font-black">اكتمال ملفك</h2><span className="font-black text-primary">{pct}%</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        {missing.length > 0
          ? <p className="mt-2 text-sm text-muted-foreground">زيد: {missing.join("، ")} — باش تبان فالأول فالبحث.</p>
          : <p className="mt-2 text-sm font-bold text-primary">ملفك كامل ✓</p>}
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="font-black">بطاقتي كما يراها الناس</h2>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border p-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-black">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (p.full_name?.[0] ?? "؟")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black">{p.full_name || "بدون اسم"}</p>
            <p className="text-sm text-muted-foreground">{p.profession || "—"} · {p.city || "—"} · {p.experience_years ?? 0} سنوات</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {p.is_available && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">🟢 متاح الآن</span>}
              {avg && <span className="rounded-full border px-2 py-0.5 text-xs font-bold">★ {avg}</span>}
              {p.skills.map((s) => <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">{s}</span>)}
            </div>
          </div>
        </div>
        <Link to="/seekers" className="mt-3 inline-block text-sm font-bold text-primary underline">شوفها فصفحة الكفاءات ←</Link>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <div className="flex items-center justify-between"><h2 className="font-black">تقييماتي</h2>{avg && <span className="font-black text-primary">★ {avg} / 5 ({reviews.length})</span>}</div>
        {reviews.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">مازال ما عندك تقييمات. طلب من المشغلين ديالك يقيموك من صفحة مدينتك.</p> : (
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border p-3">
                <div className="flex justify-between text-sm"><b>{r.author_name}</b><span className="text-primary">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type MyJob = { id: string; title: string; business_name: string; city: string; created_at: string; is_filled: boolean };

function MyJobs({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const load = () => supabase.from("jobs").select("id,title,business_name,city,created_at,is_filled").eq("owner_id", userId).order("created_at", { ascending: false })
    .then(({ data }) => setJobs((data ?? []) as MyJob[]));
  useEffect(() => { load(); }, [userId]);

  async function toggle(j: MyJob) {
    await supabase.from("jobs").update({ is_filled: !j.is_filled }).eq("id", j.id);
    load();
  }
  async function remove(j: MyJob) {
    if (!confirm("واش متأكد بغيتي تحذف هاد الإعلان؟")) return;
    await supabase.from("jobs").delete().eq("id", j.id);
    load();
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between"><h2 className="font-black">وظائفي المنشورة ({jobs.length})</h2><Link to="/post-job" className="text-sm font-bold text-primary underline">+ وظيفة جديدة</Link></div>
      {jobs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">مازال ما نشرتي حتى وظيفة.</p> : (
        <ul className="mt-3 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div>
                <p className="font-bold">{j.title} {j.is_filled && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">مكتملة</span>}</p>
                <p className="text-xs text-muted-foreground">{j.business_name} · {j.city} · {new Date(j.created_at).toLocaleDateString("ar-MA")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(j)} className={`rounded-full px-3 py-1 text-sm font-bold ${j.is_filled ? "bg-primary text-primary-foreground" : "border"}`}>
                  {j.is_filled ? "رجّعها شاغرة" : "✓ لقيت شي واحد"}
                </button>
                <button onClick={() => remove(j)} className="rounded-full border border-accent px-3 py-1 text-sm font-bold text-accent">حذف</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
