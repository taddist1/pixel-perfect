import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY = "BKYkSYxvGHigo9STiHsOxPYm-T0nWpetFZeg0n8nWz0KFf3Anlmagf-PDECzZIUOt7rjiYv-0_xV3tCyxMdoHos";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyBytes(b64: string) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Ask permission, subscribe this device and save it to the signed-in account. */
export async function enablePush(): Promise<"ok" | "denied" | "unsupported" | "signin"> {
  if (!pushSupported()) return "unsupported";
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "signin";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON();
  await supabase.from("push_subscriptions").upsert(
    { user_id: data.user.id, endpoint: j.endpoint!, p256dh: j.keys!.p256dh!, auth: j.keys!.auth! },
    { onConflict: "endpoint" },
  );
  return "ok";
}
