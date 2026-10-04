import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends phone/browser push for queued notifications (created by database triggers). */
export const flushPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const jwk = process.env["VAPID_PRIVATE_JWK"];
    if (!jwk) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildPushHTTPRequest } = await import("@pushforge/builder");

    const since = new Date(Date.now() - 864e5).toISOString();
    const { data: queued } = await supabaseAdmin
      .from("notifications").select("id,user_id,title,body,url")
      .is("pushed_at", null).gt("created_at", since).limit(300);
    if (!queued?.length) return { sent: 0 };
    await supabaseAdmin.from("notifications").update({ pushed_at: new Date().toISOString() }).in("id", queued.map((n) => n.id));

    const userIds = [...new Set(queued.map((n) => n.user_id))];
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds);
    let sent = 0;
    const dead: string[] = [];
    for (const n of queued) {
      for (const s of (subs ?? []).filter((x) => x.user_id === n.user_id)) {
        try {
          const req = await buildPushHTTPRequest({
            privateJWK: jwk,
            subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message: { payload: { title: n.title, body: n.body, url: n.url }, adminContact: "mailto:repar.machinescafes@gmail.com" },
          });
          const r = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
          if (r.status === 404 || r.status === 410) dead.push(s.id);
          else if (r.ok) sent++;
        } catch (e) {
          console.error("push failed", e);
        }
      }
    }
    if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
    return { sent };
  });
