import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/whatsapp";
import { criteria, type CriterionKey } from "@/lib/trust";
import { isAbusive } from "@/lib/moderation";

export const Route = createFileRoute("/cities/$city")({
  head: ({ params }) => {
    const c = params.city;
    const T = `وظائف وكفاءات المقاهي في ${c} — قهوتي`;
    const D = `عروض عمل، بارستا، ندلاء وتقنيو آلات القهوة في ${c}. تواصل مباشر عبر واتساب، بلا وسيط.`;
    return {
      meta: [
        { title: T },
        { name: "description", content: D },
        { property: "og:title", content: T },
        { property: "og:description", content: D },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CityPage,
});

type Job = { id: string; title: string; business_name: string; role: string; schedule: string; salary: string | null; phone: string | null; description: string | null };
type Seeker = { id: string; full_name: string | null; profession: string | null; experience_years: number | null; phone: string | null; is_available: boolean | null; skills: string[] | null };
type Review = { id: string; author_name: string; author_type: "owner" | "seeker" | null; rating: number; comment: string; created_at: string; reply: string | null; quality: number | null; commitment: number | null; communication: number | null; professionalism: number | null; profiles: { full_name: string | null; profession: string | null } | null };
const REVIEW_SELECT = "id,author_name,author_type,rating,comment,created_at,reply,quality,commitment,communication,professionalism,profiles!inner(full_name,profession,city)";

function CityPage() {
  const { city } = Route.useParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [myName, setMyName] = useState("");
  const [myAccountType, setMyAccountType] = useState<string | null>(null);
  const [rvSeeker, setRvSeeker] = useState("");
  const [eligible, setEligible] = useState<string[]>([]);
  const [crit, setCrit] = useState<Record<CriterionKey, number>>({ quality: 5, commitment: 5, communication: 5, professionalism: 5 });
  const [rvComment, setRvComment] = useState("");
  const [rvMsg, setRvMsg] = useState("");
  const [tab, setTab] = useState<"jobs" | "seekers" | "reviews">("seekers");

  useEffect(() => {
    supabase.from("jobs").select("id,title,business_name,role,schedule,salary,phone,description").eq("city", city).eq("is_filled", false).order("created_at", { ascending: false }).then(({ data }) => setJobs((data ?? []) as Job[]));
    supabase.from("public_seekers").select("id,full_name,profession,experience_years,phone,is_available,skills").eq("city", city).then(({ data }) => {
      const rows = (data ?? []) as Seeker[];
      setSeekers(rows);
      if (rows.length) setRvSeeker(rows[0]?.id ?? "");
    });
    supabase.from("reviews").select(REVIEW_SELECT).eq("profiles.city", city).order("created_at", { ascending: false }).then(({ data }) => setReviews((data ?? []) as unknown as Review[]));
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      setUser({ id: u.id });
      supabase.from("profiles").select("full_name,account_type").eq("id", u.id).maybeSingle().then(({ data: p }) => {
        setMyName((p?.full_name as string) ?? "");
        setMyAccountType((p?.account_type as string) ?? null);
      });
    });
  }, [city]);

  useEffect(() => {
    if (!user || myAccountType !== "owner") return;
    supabase.from("job_requests").select("seeker_id").eq("owner_id", user.id).eq("status", "accepted").then(({ data }) => {
      const ids = [...new Set((data ?? []).map((r) => r.seeker_id))];
      setEligible(ids);
      setRvSeeker((cur) => (ids.includes(cur) ? cur : ids.find((id) => seekers.some((s) => s.id === id)) ?? ""));
    });
  }, [user, myAccountType, seekers]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !rvSeeker) return;
    if (rvComment && isAbusive(rvComment)) return setRvMsg("⚠️ التعليق فيه كلام غير لائق — عدّلو من فضلك.");
    const vals = Object.values(crit);
    const { error } = await supabase.from("reviews").insert({
      seeker_id: rvSeeker,
      author_id: user.id,
      author_name: myName || "مستخدم قهوتي",
      author_type: "owner",
      rating: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      ...crit,
      comment: rvComment.trim(),
    });
    if (error) return setRvMsg(error.code === "23505" ? "سبق ليك قيّمتي هاد الكفاءة." : "ما يمكنش — التقييم كيتقبل غير من بعد خدمة مقبولة.");
    setRvMsg("تم نشر التقييم ✓");
    setRvComment("");
    const { data } = await supabase.from("reviews").select(REVIEW_SELECT).eq("profiles.city", city).order("created_at", { ascending: false });
    setReviews((data ?? []) as unknown as Review[]);
  }

  const tabs: [typeof tab, string, number][] = [
    ["seekers", "الكفاءات", seekers.length],
    ["jobs", "الوظائف", jobs.length],
    ["reviews", "التقييمات", reviews.length],
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-2xl font-black text-primary">قهوتي</Link>
        <Link to="/account" className="rounded-full border px-4 py-1.5 text-sm font-bold">حسابي</Link>
      </header>

      <section className="bg-primary py-12 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm opacity-80"><Link to="/" className="underline">الرئيسية</Link> › {city}</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">📍 {city}</h1>
          <p className="mt-3 max-w-xl opacity-90">كل كفاءات ووظائف المقاهي والمطاعم في {city} — في مكان واحد.</p>
          <div className="mt-5 flex gap-6 text-sm font-bold">
            <span>{seekers.length} كفاءة</span>
            <span>{jobs.length} وظيفة</span>
            <span>{reviews.length} تقييم</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <div className="flex gap-2 border-b">
          {tabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-t-xl px-5 py-3 font-black ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
              {label} ({n})
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-8 pb-16">
        {tab === "seekers" && (
          seekers.length === 0 ? (
            <p className="rounded-2xl border p-10 text-center text-muted-foreground">لا توجد كفاءات مسجلة في {city} بعد.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seekers.map((s) => (
                <div key={s.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black">{s.full_name ?? "بدون اسم"}</div>
                    {s.is_available && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">🟢 متاح الآن</span>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.profession ?? "مهنة غير محددة"}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    {s.experience_years != null && <span className="rounded-full bg-accent/20 px-3 py-1">خبرة {s.experience_years} سنة</span>}
                    {(s.skills ?? []).map((sk) => <span key={sk} className="rounded-full bg-secondary px-3 py-1">{sk}</span>)}
                  </div>
                  {s.phone && (
                    <a href={whatsappUrl(s.phone, `سلام ${s.full_name ?? ""}، شفت ملفك في منصة قهوتي وعندي فرصة عمل ليك.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-4 block rounded-full bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground">
                      تواصل عبر واتساب
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "jobs" && (
          jobs.length === 0 ? (
            <p className="rounded-2xl border p-10 text-center text-muted-foreground">لا توجد وظائف منشورة في {city} بعد.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((j) => (
                <div key={j.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-black">{j.title}</h2>
                      <p className="text-sm text-muted-foreground">{j.business_name}</p>
                    </div>
                    <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-bold">{j.role} · {j.schedule}</span>
                  </div>
                  {j.description && <p className="mt-3 text-sm">{j.description}</p>}
                  {j.salary && <p className="mt-2 text-sm font-bold">💰 {j.salary}</p>}
                  {j.phone && (
                    <a href={whatsappUrl(j.phone, `سلام، شفت إعلان "${j.title}" في منصة قهوتي وبغيت نقدم ترشيحي.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
                      تواصل عبر واتساب
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "reviews" && (
          <div className="space-y-6">
            {myAccountType === "owner" && (eligible.some((id) => seekers.some((s) => s.id === id)) ? (
              <form onSubmit={submitReview} className="rounded-2xl border bg-card p-5">
                <h2 className="font-black">أضف تقييم موثّق 👇</h2>
                <p className="mt-1 text-xs text-muted-foreground">تقييم واحد لكل كفاءة، وغير من بعد خدمة مقبولة.</p>
                <select value={rvSeeker} onChange={(e) => setRvSeeker(e.target.value)} className="mt-3 w-full rounded-xl border bg-card px-4 py-3">
                  {seekers.filter((s) => eligible.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.full_name ?? "بدون اسم"}</option>)}
                </select>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {criteria.map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm font-bold">
                      {label}
                      <select value={crit[k]} onChange={(e) => setCrit({ ...crit, [k]: Number(e.target.value) })} className="bg-card text-accent">
                        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <textarea value={rvComment} onChange={(e) => setRvComment(e.target.value)} maxLength={500} placeholder="شنو رأيك فالخدمة؟" rows={3}
                  className="mt-3 w-full rounded-xl border bg-card px-4 py-3" />
                <button className="mt-3 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">نشر التقييم</button>
                {rvMsg && <span className="ms-3 text-sm">{rvMsg}</span>}
              </form>
            ) : (
              <p className="rounded-2xl border bg-secondary/60 p-4 text-sm">🔒 التقييم كيتفتح ليك ملي كفاءة من {city} تقبل طلب العمل ديالك.</p>
            ))}
            {reviews.length === 0 ? (
              <p className="rounded-2xl border p-10 text-center text-muted-foreground">لا توجد تقييمات بعد في {city}.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-black">{r.author_name}</span>
                        {r.author_type === "owner" && (
                          <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">✅ تقييم موثّق</span>
                        )}
                      </div>
                      <span className="text-accent">{"★".repeat(r.rating)}<span className="opacity-30">{"★".repeat(5 - r.rating)}</span></span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">عن {r.profiles?.full_name ?? "كفاءة"}{r.profiles?.profession ? ` · ${r.profiles.profession}` : ""}</p>
                    {r.quality != null && (
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        {criteria.map(([k, label]) => <span key={k}>{label}: <b className="text-accent">{r[k]}/5</b></span>)}
                      </div>
                    )}
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    {r.reply && <p className="mt-2 rounded-xl bg-muted p-3 text-sm"><b>رد الكفاءة:</b> {r.reply}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
