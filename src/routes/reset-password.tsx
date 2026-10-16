import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "استرجاع كلمة السر — قهوتي" },
    { name: "description", content: "اختر كلمة سر جديدة لحسابك في قهوتي عبر رابط الاسترجاع الآمن." },
    { property: "og:title", content: "استرجاع كلمة السر — قهوتي" },
    { property: "og:description", content: "استرجاع الدخول إلى حسابك في قهوتي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        sessionStorage.setItem("qahwati_recovery", "1");
        setStatus("ready");
      }
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (!error && data.user && (recovery || sessionStorage.getItem("qahwati_recovery") === "1")) {
        sessionStorage.setItem("qahwati_recovery", "1");
        setStatus("ready");
        window.history.replaceState(null, "", window.location.pathname);
      } else setStatus((current) => current === "ready" ? current : "invalid");
    }).catch(() => { if (active) setStatus("invalid"); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("كلمتا السر غير متطابقتين."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(/weak|pwned/i.test(error.message) ? "اختر كلمة سر أقوى وغير مستعملة سابقاً." : "تعذّر تغيير كلمة السر. حاول مجدداً أو اطلب رابطاً جديداً.");
      } else {
        sessionStorage.removeItem("qahwati_recovery");
        await supabase.auth.signOut();
        setStatus("done");
      }
    } catch { setMessage("تعذّر الاتصال، حاول مجدداً."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center px-5" dir="rtl">
    <section className="w-full max-w-md space-y-5 py-10">
      <Link to="/" translate="no" className="notranslate text-2xl font-black text-primary">قهوتي</Link>
      <h1 className="text-2xl font-black">كلمة سر جديدة</h1>
      {status === "checking" && <p role="status">جاري التحقق من رابط الاسترجاع…</p>}
      {status === "invalid" && <><p role="alert">رابط الاسترجاع غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً من «نسيت كلمة السر».</p><Button asChild><Link to="/auth">العودة إلى تسجيل الدخول</Link></Button></>}
      {status === "done" && <><p role="status">تم تغيير كلمة السر بنجاح. سجّل الدخول بكلمتك الجديدة.</p><Button asChild><Link to="/auth">تسجيل الدخول</Link></Button></>}
      {status === "ready" && <form onSubmit={submit} className="space-y-4">
        <label className="block">كلمة السر الجديدة<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border bg-card px-4 py-3" /></label>
        <label className="block">تأكيد كلمة السر<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border bg-card px-4 py-3" /></label>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ كلمة السر الجديدة"}</Button>
        {message && <p role="alert">{message}</p>}
      </form>}
    </section>
  </main>;
}