import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/lib/constants";
import { flushPush } from "@/lib/push.functions";
import { whatsappUrl } from "@/lib/whatsapp";

const T = "🚨 آلتي تعطلت الآن — تقني آلات القهوة فوراً | قهوتي";
const D = "آلة القهوة طاحت؟ صيفط طلب عاجل وأول تقني متاح فمدينتك كيقبلو ويتاصل بيك مباشرة.";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: T }, { name: "description", content: D },
      { property: "og:title", content: T }, { property: "og:description", content: D },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Emergency,
});

type Call = { id: string; owner_id: string; owner_name: string; city: string; phone: string; description: string; status: string; taker_id: string | null; taker_name: string | null; taker_phone: string | null; created_at: string };
type Me = { id: string; account_type: string | null; city: string | null; phone: string | null; full_name: string | null };

function Emergency() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [calls, setCalls] = useState<Call[]>([]);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => supabase.from("service_calls").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setCalls((data ?? []) as Call[]));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setMe(null);
      const { data: p } = await supabase.from("profiles").select("account_type,city,phone,full_name").eq("id", data.user.id).maybeSingle();
      setMe({ id: data.user.id, account_type: p?.account_type ?? null, city: p?.city ?? null, phone: p?.phone ?? null, full_name: p?.full_name ?? null });
      setCity(p?.city ?? cities[0] ?? ""); setPhone(p?.phone ?? "");
      load();
    });
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase.from("service_calls").insert({ owner_id: me.id, owner_name: me.full_name ?? "", city, phone: phone.trim(), description: desc.trim() });
    if (error) return setMsg("وقع خطأ، تأكد من المعلومات.");
    flushPush().catch(() => {});
    setDesc(""); setMsg("✅ تصيفط الطلب لكل التقنيين المتاحين فـ " + city); load();
  }
  async function accept(id: string) {
    const { data, error } = await supabase.rpc("accept_service_call", { _id: id });
    if (error || !data) alert("سبقك شي تقني آخر لهاد الطلب.");
    else flushPush().catch(() => {});
    load();
  }
  async function close(id: string) {
    await supabase.from("service_calls").update({ status: "closed" }).eq("id", id); load();
  }

  const mine = calls.filter((c) => c.owner_id === me?.id);
  const open = calls.filter((c) => c.status === "open" && c.city === me?.city && c.owner_id !== me?.id);
  const taken = calls.filter((c) => c.taker_id === me?.id);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link to="/" translate="no" className="notranslate text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </header>
      <section className="bg-accent py-10 text-accent-foreground">
        <div className="mx-auto max-w-4xl px-5">
          <h1 className="text-3xl font-black md:text-4xl">🚨 آلتي تعطلت الآن</h1>
          <p className="mt-2 opacity-90">الطلب كيوصل فوراً لكل تقنيي آلات القهوة المتاحين فمدينتك — وأول واحد كيقبل كيتاصل بيك.</p>
        </div>
      </section>
      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8 pb-16">
        {me === null && <p className="rounded-2xl border p-6 text-center">سجّل الدخول باش تستعمل الخدمة. <Link to="/auth" className="font-bold text-primary underline">تسجيل الدخول</Link></p>}

        {me?.account_type === "owner" && (
          <>
            <form onSubmit={send} className="space-y-3 rounded-2xl border bg-card p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl border bg-card px-4 py-3">{cities.map((c) => <option key={c}>{c}</option>)}</select>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="رقم الهاتف" className="rounded-xl border bg-card px-4 py-3" />
              </div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} required minLength={3} maxLength={500} rows={3} placeholder="شنو المشكل؟ (مثلاً: الآلة ما كتسخنش، تسريب الماء…)" className="w-full rounded-xl border bg-card px-4 py-3" />
              <button className="w-full rounded-full bg-accent px-6 py-3 text-lg font-black text-accent-foreground">🚨 صيفط طلب عاجل</button>
              {msg && <p className="text-sm">{msg}</p>}
            </form>
            <h2 className="text-xl font-black">طلباتي</h2>
            {mine.length === 0 ? <p className="text-sm text-muted-foreground">ما عندك حتى طلب.</p> : mine.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-card p-4">
                <p className="font-bold">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.city} · {new Date(c.created_at).toLocaleString("ar-MA")}</p>
                {c.status === "open" && <p className="mt-2 text-sm">⏳ كنتسناو تقني يقبل…</p>}
                {c.status === "taken" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>✅ قبلو: <b>{c.taker_name}</b></span>
                    {c.taker_phone && <a href={whatsappUrl(c.taker_phone)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-primary px-3 py-1 font-bold text-primary-foreground">واتساب</a>}
                  </div>
                )}
                {c.status !== "closed" ? <button onClick={() => close(c.id)} className="mt-2 text-xs underline">سدّ الطلب</button> : <p className="mt-2 text-xs">مسدود</p>}
              </div>
            ))}
          </>
        )}

        {me?.account_type === "seeker" && (
          <>
            <h2 className="text-xl font-black">طلبات مفتوحة فـ {me.city ?? "مدينتك"}</h2>
            {open.length === 0 ? <p className="text-sm text-muted-foreground">ما كاين حتى طلب عاجل دابا. غادي يوصلك إشعار ملي يطلع واحد.</p> : open.map((c) => (
              <div key={c.id} className="rounded-2xl border border-accent/50 bg-card p-4">
                <p className="font-bold">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.owner_name || "صاحب مقهى"} · {new Date(c.created_at).toLocaleTimeString("ar-MA")}</p>
                <button onClick={() => accept(c.id)} className="mt-3 rounded-full bg-accent px-5 py-2 font-black text-accent-foreground">⚡ قبلت — أنا جاي</button>
              </div>
            ))}
            {taken.length > 0 && <h2 className="text-xl font-black">المهام ديالي</h2>}
            {taken.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-card p-4">
                <p className="font-bold">{c.description}</p>
                <a href={whatsappUrl(c.phone, "سلام، أنا التقني من قهوتي، جاي عندك للآلة.")} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">تواصل مع {c.owner_name || "صاحب المقهى"}</a>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
