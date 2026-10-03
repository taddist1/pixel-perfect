import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractYouTubeId, videoCategories, youtubeThumbnail } from "@/lib/youtube";

const T = "إدارة الفيديوهات — قهوتي";
const D = "إضافة وتنظيم الفيديوهات التعليمية في منصة قهوتي.";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { name: "robots", content: "noindex" },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminVideos,
});

function AdminVideos() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("القهوة");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const youtubeId = extractYouTubeId(url);

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      return Boolean(data);
    },
  });

  const videos = useQuery({
    queryKey: ["admin-educational-videos"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("educational_videos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (role.isLoading) return <main dir="rtl" className="p-10 text-center">جاري التحقق...</main>;
  if (!role.data) return <main dir="rtl" className="p-10 text-center">هاد الصفحة خاصة بمسؤولي الموقع. <Link to="/" className="text-primary">الرئيسية</Link></main>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) { setMessage("رابط YouTube غير صحيح."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("educational_videos").insert({
      youtube_url: `https://www.youtube.com/watch?v=${id}`,
      youtube_id: id,
      title: title.trim(),
      description: description.trim(),
      category,
      is_published: published,
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setUrl(""); setTitle(""); setDescription(""); setPublished(true);
    setMessage("تمت إضافة الفيديو بنجاح.");
    queryClient.invalidateQueries({ queryKey: ["admin-educational-videos"] });
    queryClient.invalidateQueries({ queryKey: ["educational-videos"] });
  };

  const togglePublished = async (id: string, next: boolean) => {
    const { error } = await supabase.from("educational_videos").update({ is_published: next }).eq("id", id);
    if (error) { setMessage(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-educational-videos"] });
    queryClient.invalidateQueries({ queryKey: ["educational-videos"] });
  };

  const remove = async (id: string) => {
    if (!window.confirm("واش متأكد بغيتي تحذف هاد الفيديو؟")) return;
    const { error } = await supabase.from("educational_videos").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-educational-videos"] });
    queryClient.invalidateQueries({ queryKey: ["educational-videos"] });
  };

  return (
    <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/videos" className="text-sm text-muted-foreground">← مكتبة الفيديوهات</Link>
          <h1 className="mt-3 text-3xl font-black">إدارة الفيديوهات</h1>
        </div>
        <Button asChild variant="outline"><Link to="/admin/articles">مولّد المقالات</Link></Button>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">رابط YouTube</Label>
          <Input id="youtube-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." dir="ltr" />
          {url && !youtubeId && <p className="text-sm text-destructive">دخل رابط YouTube صحيح.</p>}
        </div>
        {youtubeId && <img src={youtubeThumbnail(youtubeId)} alt="معاينة الفيديو" className="aspect-video w-full max-w-sm rounded-md object-cover" />}
        <div className="space-y-2">
          <Label htmlFor="video-title">العنوان</Label>
          <Input id="video-title" required minLength={3} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: الطريقة الصحيحة لتنظيف آلة الإسبريسو" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="video-description">وصف قصير</Label>
          <Textarea id="video-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="شنو غادي يتعلم المشاهد من هاد الفيديو؟" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="video-category">التصنيف</Label>
            <select id="video-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {videoCategories.filter((item) => item !== "الكل").map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-bold">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="size-4 accent-primary" />
            نشر الفيديو مباشرة
          </label>
        </div>
        {message && <p className={message.includes("بنجاح") ? "text-sm font-bold text-primary" : "text-sm font-bold text-destructive"}>{message}</p>}
        <Button type="submit" disabled={busy || !youtubeId || title.trim().length < 3}>{busy ? "جاري الحفظ..." : "إضافة الفيديو"}</Button>
      </form>

      <h2 className="mt-10 text-xl font-black">كل الفيديوهات</h2>
      {videos.isLoading && <p className="mt-4 text-muted-foreground">جاري التحميل...</p>}
      <div className="mt-4 space-y-3">
        {videos.data?.length === 0 && <p className="text-muted-foreground">ما كاين حتى فيديو.</p>}
        {videos.data?.map((video) => (
          <article key={video.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
            <img src={youtubeThumbnail(video.youtube_id)} alt="" className="aspect-video w-full rounded-md object-cover sm:w-40" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-primary">{video.category}</span><span className="text-xs text-muted-foreground">{video.is_published ? "منشور" : "مسودة"}</span></div>
              <h3 className="mt-1 font-black">{video.title}</h3>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => togglePublished(video.id, !video.is_published)} aria-label={video.is_published ? "إخفاء الفيديو" : "نشر الفيديو"} title={video.is_published ? "إخفاء" : "نشر"}>
                {video.is_published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(video.id)} aria-label="حذف الفيديو" title="حذف"><Trash2 aria-hidden="true" /></Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
