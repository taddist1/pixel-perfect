import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cities, professions, schedules } from "@/lib/constants";
import { flushPush } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => ({ meta: [{ title: "نشر وظيفة — قهوتي" }, { name: "description", content: "انشر وظيفة لمقهاك أو مطعمك" }] }),
  component: PostJob,
});

function PostJob() {
  const nav = useNavigate();
  const [f, setF] = useState({ title: "", business_name: "", city: cities[0]!, role: professions[0]!, schedule: schedules[0]!, salary: "", description: "", phone: "" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const input = "w-full rounded-xl border bg-card px-4 py-3";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("jobs").insert(f);
    if (error) return setMsg("وقع خطأ، حاول مرة أخرى");
    flushPush().catch(() => {});
    nav({ to: "/jobs" });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link to="/account" className="text-sm underline">← حسابي</Link>
      <h1 className="mt-4 text-3xl font-black">نشر وظيفة جديدة</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl border bg-card p-6">
        <input className={input} placeholder="عنوان الوظيفة (مثلاً: بارستا محترف)" value={f.title} onChange={set("title")} required />
        <input className={input} placeholder="اسم المقهى أو المطعم" value={f.business_name} onChange={set("business_name")} required />
        <div className="grid grid-cols-3 gap-3">
          <select className={input} value={f.city} onChange={set("city")}>{cities.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={input} value={f.role} onChange={set("role")}>{professions.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={input} value={f.schedule} onChange={set("schedule")}>{schedules.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <input className={input} placeholder="الأجر (اختياري، مثلاً 3000 درهم)" value={f.salary} onChange={set("salary")} />
        <input className={input} dir="ltr" placeholder="هاتف التواصل 06XXXXXXXX" value={f.phone} onChange={set("phone")} />
        <textarea className={input} rows={4} placeholder="تفاصيل الوظيفة" value={f.description} onChange={set("description")} />
        <button className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground">نشر</button>
        {msg && <p className="text-center text-sm">{msg}</p>}
      </form>
    </div>
  );
}
