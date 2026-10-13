import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { citiesQueryKey, useCities } from "@/lib/use-cities";

const T = "إعدادات المدير — قهوتي";
const D = "تغيير كلمة السر وإدارة المدن وإشعارات منصة قهوتي.";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { name: "robots", content: "noindex" },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminSettings,
});

const box = "rounded-3xl border bg-card p-6 shadow-sm";
const input = "w-full rounded-xl border bg-background px-4 py-3";

function AdminSettings() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setIsAdmin(false);
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(!!ok);
    });
  }, []);

  if (isAdmin === null) return <p className="p-10 text-center text-muted-foreground">جاري التحميل...</p>;
  if (!isAdmin) return <p className="p-10 text-center">هذه الصفحة خاصة بالمدير. <Link to="/account" className="text-primary underline">رجوع</Link></p>;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">⚙️ إعدادات المدير</h1>
        <Link to="/account" className="text-sm text-muted-foreground underline">حسابي</Link>
      </div>
      <PasswordBox />
      <NotificationsBox />
      <CitiesBox />
    </main>
  );
}

function PasswordBox() {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setMsg("كلمتا السر غير متطابقتين.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setMsg(error ? "تعذّر التغيير: اختر كلمة سر أقوى (6 أحرف على الأقل)." : "تم تغيير كلمة السر ✅");
    if (!error) { setPw(""); setPw2(""); }
    setBusy(false);
  }
  return (
    <section className={box}>
      <h2 className="text-lg font-black">🔒 تغيير كلمة السر</h2>
      <form onSubmit={save} className="mt-4 space-y-3">
        <input className={input} type="password" dir="ltr" minLength={6} required placeholder="كلمة السر الجديدة" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className={input} type="password" dir="ltr" minLength={6} required placeholder="أعد كتابتها" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60">حفظ</button>
      </form>
      {msg && <p className="mt-3 text-center text-sm">{msg}</p>}
    </section>
  );
}

type Settings = { notify_new_profile: boolean; notify_new_review: boolean };

function NotificationsBox() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("notify_new_profile, notify_new_review").eq("id", 1).single();
      if (error) throw error;
      return data as Settings;
    },
  });
  async function toggle(key: keyof Settings) {
    if (!data) return;
    const patch: Partial<Settings> & { updated_at: string } = { updated_at: new Date().toISOString() };
    patch[key] = !data[key];
    await supabase.from("site_settings").update(patch).eq("id", 1);
    qc.invalidateQueries({ queryKey: ["site_settings"] });
  }
  const rows: [keyof Settings, string][] = [
    ["notify_new_profile", "👤 إشعار عند تسجيل شخص جديد"],
    ["notify_new_review", "⭐ إشعار عند إضافة تقييم جديد"],
  ];
  return (
    <section className={box}>
      <h2 className="text-lg font-black">🔔 إشعارات الموقع</h2>
      <div className="mt-4 space-y-3">
        {rows.map(([k, label]) => (
          <button key={k} onClick={() => toggle(k)} disabled={!data} className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start">
            <span className="font-bold">{label}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${data?.[k] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{data?.[k] ? "مفعّل" : "متوقف"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CitiesBox() {
  const qc = useQueryClient();
  const cities = useCities();
  const [name, setName] = useState(""); const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: citiesQueryKey });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim(); if (!n) return;
    const { error } = await supabase.from("cities").insert({ name: n });
    setMsg(error ? (error.code === "23505" ? "هذه المدينة موجودة." : "تعذّرت الإضافة.") : `أضيفت ${n} ✅`);
    if (!error) { setName(""); refresh(); }
  }
  async function remove(n: string) {
    if (!confirm(`حذف ${n} من القائمة؟`)) return;
    const { error } = await supabase.from("cities").delete().eq("name", n);
    setMsg(error ? "تعذّر الحذف." : `حُذفت ${n}`);
    refresh();
  }
  return (
    <section className={box}>
      <h2 className="text-lg font-black">🏙️ إدارة المدن ({cities.length})</h2>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input className={input} placeholder="اسم مدينة جديدة" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="shrink-0 rounded-xl bg-primary px-5 font-black text-primary-foreground">إضافة</button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <ul className="mt-4 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
            {c}
            <button onClick={() => remove(c)} aria-label={`حذف ${c}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
