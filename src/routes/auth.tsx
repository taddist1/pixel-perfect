import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s["next"] === "string" ? { next: s["next"] } : {}),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — قهوتي" },
      { name: "description", content: "أنشئ حسابك المجاني في قهوتي بالبريد أو برقم هاتفك، أو سجّل الدخول." },
      { property: "og:title", content: "تسجيل الدخول — قهوتي" },
      { property: "og:description", content: "أنشئ حسابك المجاني في قهوتي بالبريد أو برقم هاتفك، أو سجّل الدخول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { next: rawNext } = Route.useSearch();
  const next = rawNext ? oauthReturnPath(rawNext) : null;
  const go = () => (next ? window.location.assign(next) : nav({ to: "/account" }));
  const back = () => (next ? new URL(next, window.location.origin).href : window.location.origin + "/auth");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && go());
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) go();
    });
    return () => data.subscription.unsubscribe();
  }, [nav, next]);

  const phoneE164 = () => "+212" + phoneDigits;
  const phoneEmail = () => `212${phoneDigits}@phone.kahwaty.online`;
  const phoneValid = () => /^[67]\d{8}$/.test(phoneDigits);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (method === "phone") {
      if (!phoneValid()) {
        setMsg("رقم الهاتف غير صحيح — اكتب 9 أرقام تبدأ بـ 6 أو 7.");
        setBusy(false);
        return;
      }
      if (password.length < 6) {
        setMsg("كلمة السر يجب أن تكون 6 أحرف على الأقل.");
        setBusy(false);
        return;
      }
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: phoneEmail(),
          password,
          options: { emailRedirectTo: back(), data: { full_name: name || "مستخدم قهوتي", phone: phoneE164() } },
        });
        if (!error) {
          setMsg("تم إنشاء حسابك ✅ جاري تحويلك لإكمال ملفك...");
          nav({ to: "/account" });
        } else if (/registered/i.test(error.message)) setMsg("هذا الرقم مسجّل من قبل — اضغط «عندك حساب؟ دخول».");
        else if (error.status === 429) setMsg("انتظر دقيقة واحدة قبل المحاولة من جديد.");
        else if (/pwned|weak/i.test(error.message)) setMsg("كلمة السر ضعيفة جداً أو معروفة لدى المخترقين — اختر كلمة سر أقوى.");
        else setMsg("تعذّر إنشاء الحساب، جرّب كلمة سر أخرى (6 أحرف على الأقل).");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(), password });
        if (error) setMsg("رقم الهاتف أو كلمة السر غير صحيحة");
      }
      setBusy(false);
      return;
    }
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: back(), data: { full_name: name } },
      });
      if (!error) {
        setMsg("تم إنشاء حسابك ✅ جاري تحويلك لإكمال ملفك...");
        nav({ to: "/account" });
      } else if (error.status === 429) setMsg("انتظر دقيقة واحدة قبل المحاولة من جديد.");
      else if (/registered/i.test(error.message)) setMsg("هذا البريد مسجّل من قبل — اضغط «عندك حساب؟ دخول».");
      else if (/pwned|weak/i.test(error.message)) setMsg("كلمة السر ضعيفة جداً أو معروفة لدى المخترقين — اختر كلمة سر أقوى.");
      else setMsg("تعذّر إنشاء الحساب، تأكد من البريد وكلمة السر (6 أحرف على الأقل).");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error?.code === "email_not_confirmed") {
        setMsg("حسابك لم يتأكد بعد. افتح رسالة التأكيد في بريدك (وحتى Spam)، أو اضغط «أعد إرسال رسالة التأكيد».");
        setUnconfirmed(true);
      } else if (error) setMsg("البريد أو كلمة السر غير صحيحة");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: back() });
    if (r.error) setMsg("تعذر الدخول بـ Google");
  }

  const input = "w-full rounded-xl border bg-card px-4 py-3";
  const methodBtn = (m: "email" | "phone") =>
    `rounded-xl py-2 text-sm font-bold ${method === m ? "bg-primary text-primary-foreground" : "border"}`;
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
        <Link to="/" translate="no" className="notranslate text-2xl font-black text-primary">قهوتي</Link>
        <h1 className="mt-4 text-2xl font-black">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب مجاني"}</h1>
        <button onClick={google} className="mt-6 w-full rounded-xl border-2 py-3 font-bold">المتابعة بحساب Google</button>
        <div className="my-5 text-center text-sm text-muted-foreground">أو</div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMethod("email"); setMsg(""); }} className={methodBtn("email")}>✉️ بالبريد</button>
          <button type="button" onClick={() => { setMethod("phone"); setMsg(""); }} className={methodBtn("phone")}>📱 بالهاتف</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {method === "email" ? (
            <>
              {mode === "up" && <input className={input} placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />}
              <input className={input} type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className={input} type="password" dir="ltr" placeholder="••••••" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60">
                {mode === "in" ? "دخول" : "إنشاء الحساب"}
              </button>
            </>
          ) : (
            <>
              {mode === "up" && <input className={input} placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />}
              <div className="flex items-center gap-2" dir="ltr">
                <span className="rounded-xl border bg-muted px-3 py-3 text-sm font-bold">🇲🇦 +212</span>
                <input
                  className={input + " flex-1"}
                  inputMode="numeric"
                  placeholder="6XXXXXXXX"
                  maxLength={9}
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <input className={input} type="password" dir="ltr" placeholder="كلمة السر ••••••" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60">
                {mode === "in" ? "دخول" : "إنشاء الحساب"}
              </button>
            </>
          )}
        </form>
        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}
        {unconfirmed && (
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: back() } });
            setMsg(error ? (error.status === 429 ? "انتظر دقيقة واحدة قبل إعادة الإرسال." : "تعذّرت إعادة الإرسال.") : "أعدنا إرسال رسالة التأكيد ✉️ تفقد بريدك.");
            setBusy(false);
          }} className="mt-3 w-full rounded-xl border-2 border-primary py-2 text-sm font-bold text-primary disabled:opacity-60">أعد إرسال رسالة التأكيد</button>
        )}
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="mt-5 w-full text-sm text-muted-foreground underline">
          {mode === "in" ? "ما عندكش حساب؟ سجّل الآن" : "عندك حساب؟ دخول"}
        </button>
      </div>
    </div>
  );
}
