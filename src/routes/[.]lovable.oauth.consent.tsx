import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string; redirect_uri?: string }; scope?: string; user?: { email?: string } } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "ربط مساعد ذكي — قهوتي" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("طلب الربط ناقص أو منتهي.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: u } = await supabase.auth.getUser();
    return { details: data, email: u.user?.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-black">تعذر فتح طلب الربط</h1><p className="mt-3 text-muted-foreground">{String((error as Error)?.message ?? error)}</p></main>
  ),
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const name = details?.client?.name ?? "تطبيق خارجي";

  async function decide(approve: boolean) {
    setBusy(true); setErr(null);
    const { data, error } = approve ? await oauth().approveAuthorization(authorization_id) : await oauth().denyAuthorization(authorization_id);
    const target = data?.redirect_url ?? data?.redirect_to;
    if (error || !target) { setBusy(false); setErr(error?.message ?? "لم يتم استلام رابط الرجوع."); return; }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-black">ربط <span dir="ltr">{name}</span> بـ <span translate="no" className="notranslate">قهوتي</span></h1>
        <p className="mt-3 text-muted-foreground">هذا يسمح لـ {name} باستعمال المنصة باسمك: البحث في الوظائف والكفاءات وقراءة إشعاراتك.</p>
        {email && <p className="mt-3 text-sm">الحساب: <span dir="ltr" className="font-bold">{email}</span></p>}
        {details?.client?.redirect_uri && <p className="mt-1 break-all text-xs text-muted-foreground" dir="ltr">{details.client.redirect_uri}</p>}
        <p className="mt-3 text-xs text-muted-foreground">لا يتجاوز هذا الربط صلاحيات حسابك.</p>
        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        <div className="mt-6 flex gap-3">
          <button disabled={busy} onClick={() => decide(true)} className="flex-1 rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60">موافق</button>
          <button disabled={busy} onClick={() => decide(false)} className="flex-1 rounded-xl border-2 py-3 font-bold disabled:opacity-60">إلغاء الربط</button>
        </div>
      </div>
    </main>
  );
}
