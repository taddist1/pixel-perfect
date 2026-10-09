import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CITY_KEY = "qahwati_city";
const SEEN_KEY = "qahwati_jobs_seen_at";

export function rememberCity(city: string) {
  if (typeof window !== "undefined") localStorage.setItem(CITY_KEY, city);
}

export function markJobsSeen() {
  if (typeof window !== "undefined") localStorage.setItem(SEEN_KEY, new Date().toISOString());
}

/** User's city: profile city when signed in, otherwise the last city picked on the site. */
export function useUserCity() {
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const fallback = localStorage.getItem(CITY_KEY);
    supabase.auth.getUser().then(async ({ data }) => {
      let c = fallback;
      if (data.user) {
        const { data: p } = await supabase.from("profiles").select("city").eq("id", data.user.id).maybeSingle();
        if (p?.city) c = p.city;
      }
      if (active) setCity(c);
    });
    return () => { active = false; };
  }, []);
  return city;
}

/** Bell showing how many new jobs were posted in the user's city since their last visit. */
export function JobAlertsBell() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  if (uid === undefined) return null;
  return uid ? <AccountBell userId={uid} /> : <GuestBell />;
}

function GuestBell() {
  const city = useUserCity();
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY) ?? new Date(Date.now() - 7 * 864e5).toISOString());
  }, []);

  const { data = [] } = useQuery({
    queryKey: ["job-alerts", city, seenAt],
    enabled: !!city && !!seenAt,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!city || !seenAt) return [];
      const { data } = await supabase.from("jobs").select("id,title,business_name,created_at").eq("is_filled", false)
        .eq("city", city).gt("created_at", seenAt).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  if (!city) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <Button variant="outline" aria-label="الإشعارات" className="relative rounded-full px-3 py-1.5 text-sm font-bold">
        🔔
        {data.length > 0 && (
          <span className="absolute -top-1 -left-1 rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{data.length}</span>
        )}
      </Button>
      </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} collisionPadding={12} dir="rtl" className="w-72 max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto break-words bg-card p-3 text-card-foreground">
          <p className="mb-2 text-sm font-black">وظائف جديدة فـ {city}</p>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">ما كاين حتى وظيفة جديدة من آخر زيارة.</p>
          ) : (
            <ul className="space-y-2">
              {data.map((j) => (
                <li key={j.id} className="rounded-xl bg-muted p-2 text-sm">
                  <div className="font-bold">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.business_name}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between text-sm font-bold">
            <Link to="/new-this-week" className="text-primary underline">جديد هاد الأسبوع</Link>
            <Button variant="ghost" size="sm" onClick={() => { markJobsSeen(); setSeenAt(new Date().toISOString()); setOpen(false); }} className="text-muted-foreground">تمت القراءة</Button>
          </div>
        </PopoverContent>
    </Popover>
  );
}

function AccountBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const { data = [], refetch } = useQuery({
    queryKey: ["notifications", userId],
    refetchInterval: 60_000,
    queryFn: async () => (await supabase.from("notifications").select("id,title,body,url,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15)).data ?? [],
  });
  const unread = data.filter((n) => !n.read_at).length;
  async function readAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    refetch(); setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <Button variant="outline" aria-label="الإشعارات" className="relative rounded-full px-3 py-1.5 text-sm font-bold">
        🔔{unread > 0 && <span className="absolute -top-1 -left-1 rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{unread}</span>}
      </Button>
      </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} collisionPadding={12} dir="rtl" className="w-72 max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto break-words bg-card p-3 text-card-foreground">
          <p className="mb-2 text-sm font-black">إشعاراتي</p>
          {data.length === 0 ? <p className="text-sm text-muted-foreground">ما كاين حتى إشعار.</p> : (
            <ul className="max-h-80 space-y-2 overflow-auto">
              {data.map((n) => (
                <li key={n.id}><a href={n.url} className={`block rounded-xl p-2 text-sm ${n.read_at ? "bg-muted/50" : "bg-muted font-bold"}`}>
                  <div>{n.title}</div><div className="text-xs font-normal text-muted-foreground">{n.body}</div>
                </a></li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between text-sm font-bold">
            <Link to="/account" className="text-primary underline">📱 إشعارات الهاتف</Link>
            <Button variant="ghost" size="sm" onClick={readAll} className="text-muted-foreground">تمت القراءة</Button>
          </div>
        </PopoverContent>
    </Popover>
  );
}
