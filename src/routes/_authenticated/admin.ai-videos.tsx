import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Play, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipPlayer } from "@/components/ClipPlayer";
import { advanceAiVideo, createAiVideo, getAiVideoClips, retryAiVideo } from "@/lib/ai-videos.functions";
import { aiVideoCategories, AI_VIDEO_MAX_SECONDS, narrationTiming } from "@/lib/ai-video-rules";
import { MAX_REFERENCE_BYTES, type ReferenceImage } from "@/lib/ai-video-continuity";

const T = "مولّد الفيديوهات بالذكاء الاصطناعي — قهوتي";
const D = "إنشاء فيديوهات تعليمية بالذكاء الاصطناعي في مواضيع القهوة والصيانة والباريستا والنادل.";

export const Route = createFileRoute("/_authenticated/admin/ai-videos")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { name: "robots", content: "noindex" },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminAiVideos,
});

type Scene = { status: string };

function AdminAiVideos() {
  const qc = useQueryClient();
  const create = useServerFn(createAiVideo);
  const advance = useServerFn(advanceAiVideo);
  const retry = useServerFn(retryAiVideo);
  const clips = useServerFn(getAiVideoClips);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<(typeof aiVideoCategories)[number]>("القهوة");
  const [script, setScript] = useState("");
  const timing = narrationTiming(script);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | undefined>();
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ id: string; urls: string[] } | null>(null);
  const running = useRef(false);

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return Boolean(data);
    },
  });
  const videos = useQuery({
    queryKey: ["admin-ai-videos"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_videos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generating = videos.data?.find((v) => v.status === "generating");
  useEffect(() => {
    if (!generating || generating.id !== approvedId || running.current) return;
    running.current = true;
    let stop = false;
    (async () => {
      while (!stop) {
        try {
          const r = await advance({ data: { id: generating.id, consent: true } });
          if (r.status !== "generating") break;
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "وقع خطأ.");
          break;
        }
        qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
        await new Promise((r) => setTimeout(r, 8000));
      }
      running.current = false;
      qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
    })();
    return () => { stop = true; };
  }, [generating?.id, approvedId]);

  if (role.isLoading) return <main dir="rtl" className="p-10 text-center">جاري التحقق...</main>;
  if (!role.data) return <main dir="rtl" className="p-10 text-center">هاد الصفحة خاصة بمسؤولي الموقع. <Link to="/" className="text-primary">الرئيسية</Link></main>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timing.tooLong) { setMessage("السيناريو طويل على 180 ثانية؛ اختصره إلى 360 كلمة أو أقل."); return; }
    if (!window.confirm(script.trim()
      ? `المدة المقدّرة ${timing.seconds} ثانية (${timing.scenes} مقاطع). التوليد عنده تكلفة. واش كتوافق؟`
      : "المدة غادي تتحسب من السيناريو المكتوب تلقائياً، بحد أقصى 180 ثانية (18 مقطع). التوليد عنده تكلفة حسب عدد المقاطع. واش كتوافق؟")) return;
    setBusy(true); setMessage("");
    try {
      const result = await create({ data: { topic: topic.trim(), category, script: script.trim() || undefined, referenceImage, consent: true } });
      setApprovedId(result.id);
      setTopic("");
      setScript("");
      setMessage("تكتب السيناريو، وبدا توليد المقاطع. خلي الصفحة مفتوحة حتى يكمل.");
      qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "وقع خطأ.");
    }
    setBusy(false);
  };

  const togglePublished = async (id: string, next: boolean) => {
    await supabase.from("ai_videos").update({ is_published: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
  };
  const remove = async (id: string) => {
    if (!window.confirm("واش متأكد بغيتي تحذف هاد الفيديو؟")) return;
    await supabase.from("ai_videos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
  };

  return (
    <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/admin/videos" className="text-sm text-muted-foreground">← إدارة الفيديوهات</Link>
      <h1 className="mt-3 text-3xl font-black">مولّد الفيديوهات بالذكاء الاصطناعي</h1>
      <p className="mt-2 text-sm text-muted-foreground">فيديو تعليمي واقعي بتعليق بالدارجة، حتى {AI_VIDEO_MAX_SECONDS} ثانية، في مواضيع المنصة فقط. كل 10 ثواني مقطع، والمقاطع كتشتغل وحدة مور وحدة.</p>

      <form onSubmit={submit} className="mt-7 space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="ai-topic">الموضوع</Label>
          <Input id="ai-topic" required minLength={5} maxLength={300} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: كيفاش تنظف رأس آلة الإسبريسو كل نهار" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-script">السيناريو (اختياري)</Label>
          <textarea
            id="ai-script"
            rows={5}
            maxLength={5000}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="كتب النص بالدارجة هنا..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {script.trim() && (
            <p role="status" className={`text-xs ${timing.tooLong ? "text-destructive" : "text-muted-foreground"}`}>{timing.tooLong ? "السيناريو طويل على 180 ثانية؛ اختصره إلى 360 كلمة أو أقل." : `${timing.words} كلمة · ${timing.scenes} مقاطع`}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-reference">صورة مرجعية للشخص والمكان (اختياري)</Label>
          <Input id="ai-reference" type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
            const file = e.target.files?.[0];
            setReferenceImage(undefined);
            if (!file) return;
            if (file.size > MAX_REFERENCE_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              setMessage("اختار صورة JPG أو PNG أو WebP ما تفوتش 1 ميغابايت.");
              e.target.value = "";
              return;
            }
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",")[1] ?? "") : reject(new Error("الصورة ما تقراتش."));
              reader.onerror = () => reject(new Error("الصورة ما تقراتش."));
              reader.readAsDataURL(file);
            }).catch(() => "");
            if (!data) { setMessage("الصورة ما تقراتش، عاود الاختيار."); return; }
            setReferenceImage({ data, mime_type: file.type as ReferenceImage["mime_type"] });
          }} />
          {referenceImage && <img alt="الصورة المرجعية" src={`data:${referenceImage.mime_type};base64,${referenceImage.data}`} className="h-32 max-w-full rounded-md object-contain" />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-category">التصنيف</Label>
            <select id="ai-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {aiVideoCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>المدة التلقائية المقدّرة</Label>
            <output aria-label="المدة التلقائية المقدّرة" className="block text-sm font-bold" aria-live="polite">{script.trim() ? `${timing.seconds} ثانية` : "تُحدد بعد كتابة السيناريو تلقائياً"}</output>
          </div>
        </div>
        {message && <p className="text-sm font-bold text-primary">{message}</p>}
        <Button type="submit" disabled={busy || !!generating || topic.trim().length < 5 || timing.tooLong}>
          <Sparkles aria-hidden="true" />{busy ? "جاري كتابة السيناريو..." : generating ? "كاين فيديو كيتولّد دابا" : "ولّد الفيديو"}
        </Button>
      </form>

      <h2 className="mt-10 text-xl font-black">الفيديوهات المولّدة</h2>
      <div className="mt-4 space-y-3">
        {videos.data?.length === 0 && <p className="text-muted-foreground">ما كاين حتى فيديو.</p>}
        {videos.data?.map((v) => {
          const scenes = (v.scenes ?? []) as Scene[];
          const done = scenes.filter((s) => s.status === "done").length;
          return (
            <article key={v.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex gap-2 text-xs"><span className="font-bold text-primary">{v.category}</span><span className="text-muted-foreground">{v.duration_seconds} ثانية</span></div>
                  <h3 className="mt-1 font-black">{v.title || v.topic}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {v.status === "generating" && `${approvedId === v.id ? "جاري التوليد" : "متوقف بانتظار موافقتك"}: ${done} من ${scenes.length} مقاطع`}
                    {v.status === "ready" && (v.is_published ? "منشور في صفحة الفيديوهات" : "جاهز — غير منشور")}
                    {v.status === "failed" && `توقف: ${v.error ?? ""}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {v.status === "generating" && approvedId !== v.id && <Button type="button" variant="outline" onClick={() => {
                    if (window.confirm("المتابعة قد تولّد المقاطع المتبقية بتكلفة إضافية. واش كتوافق؟")) setApprovedId(v.id);
                  }}><Play aria-hidden="true" />متابعة</Button>}
                  {v.status === "ready" && (
                    <>
                      <Button type="button" variant="outline" size="icon" title="شاهد" aria-label="شاهد" onClick={async () => setPreview({ id: v.id, urls: (await clips({ data: { id: v.id } })).urls })}><Play aria-hidden="true" /></Button>
                      <Button type="button" variant="outline" size="icon" title={v.is_published ? "إخفاء" : "نشر"} aria-label={v.is_published ? "إخفاء" : "نشر"} onClick={() => togglePublished(v.id, !v.is_published)}>{v.is_published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                    </>
                  )}
                  {v.status === "failed" && <Button type="button" variant="outline" size="icon" title="كمّل التوليد" aria-label="كمّل التوليد" disabled={!!generating} onClick={async () => {
                    if (!window.confirm("إعادة المحاولة قد تولّد مقاطع بتكلفة إضافية. واش كتوافق؟")) return;
                    await retry({ data: { id: v.id } }); setApprovedId(v.id); qc.invalidateQueries({ queryKey: ["admin-ai-videos"] });
                  }}><RotateCcw aria-hidden="true" /></Button>}
                  <Button type="button" variant="destructive" size="icon" title="حذف" aria-label="حذف" onClick={() => remove(v.id)}><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
              {preview?.id === v.id && <div className="mt-4"><ClipPlayer urls={preview.urls} autoPlay /></div>}
            </article>
          );
        })}
      </div>
    </main>
  );
}
