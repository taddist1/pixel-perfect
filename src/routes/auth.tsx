import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — قهوتي" },
      { name: "description", content: "أنشئ حسابك المجاني في قهوتي أو سجّل الدخول." },
      { property: "og:title", content: "تسجيل الدخول — قهوتي" },
      { property: "og:description", content: "أنشئ حسابك المجاني في قهوتي أو سجّل الدخول." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && nav({ to: "/account" }));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) nav({ to: "/account" });
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } },
      });
      setMsg(error ? error.message : "تفقد بريدك الإلكتروني لتأكيد الحساب ✉️");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("البريد أو كلمة السر غير صحيحة");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg("تعذر الدخول بـ Google");
  }

  const input = "w-full rounded-xl border bg-card px-4 py-3";
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <h1 className="mt-4 text-2xl font-black">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب مجاني"}</h1>
        <button onClick={google} className="mt-6 w-full rounded-xl border-2 py-3 font-bold">المتابعة بحساب Google</button>
        <div className="my-5 text-center text-sm text-muted-foreground">أو</div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <input className={input} placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />}
          <input className={input} type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" dir="ltr" placeholder="••••••" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60">
            {mode === "in" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="mt-5 w-full text-sm text-muted-foreground underline">
          {mode === "in" ? "ما عندكش حساب؟ سجّل الآن" : "عندك حساب؟ دخول"}
        </button>
      </div>
    </div>
  );
}
