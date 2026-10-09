import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videoCategories } from "@/lib/youtube";
import type { Tables } from "@/integrations/supabase/types";

const T = "فيديوهات تعليمية للمقاهي والمطاعم — قهوتي";
const D = "شاهد فيديوهات عملية حول تحضير القهوة، صيانة الآلات، تسيير المقاهي وتطوير مهارات العمل في المغرب.";
type Video = Tables<"educational_videos">;

export const Route = createFileRoute("/videos")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: VideosPage,
});

function VideosPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [active, setActive] = useState<Video | null>(null);
  const videos = useQuery({
    queryKey: ["educational-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("educational_videos").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (videos.data ?? []).filter((video) => {
      const categoryMatches = category === "الكل" || video.category === category;
      const textMatches = !term || `${video.title} ${video.description} ${video.category}`.toLowerCase().includes(term);
      return categoryMatches && textMatches;
    });
  }, [videos.data, query, category]);

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" translate="no" className="notranslate text-2xl font-black text-primary">قهوتي</Link>
          <Button asChild variant="ghost"><Link to="/"><ArrowRight aria-hidden="true" />الرئيسية</Link></Button>
        </div>
      </header>

      <section className="border-b border-border bg-primary py-10 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-bold opacity-80">تعلّم وطوّر مهاراتك</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">الفيديوهات التعليمية</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 opacity-85">شروحات عملية لأصحاب المقاهي، الباريستا، التقنيين وكل العاملين في القطاع.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="قلّب على موضوع أو مهارة..." className="h-11 pr-10" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {videoCategories.map((item) => (
              <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>{item}</Button>
            ))}
          </div>
        </div>

        {videos.isLoading && <p className="py-16 text-center text-muted-foreground">جاري تحميل الفيديوهات...</p>}
        {videos.isError && <p className="py-16 text-center text-destructive">تعذر تحميل الفيديوهات. حاول مرة أخرى.</p>}
        {!videos.isLoading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <h2 className="text-xl font-black">ما لقينا حتى فيديو دابا</h2>
            <p className="mt-2 text-muted-foreground">جرّب كلمة أو تصنيف آخر، أو رجع قريباً لمحتوى جديد.</p>
          </div>
        )}
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video) => <VideoCard key={video.id} video={video} onPlay={setActive} />)}
        </div>
      </section>

      {active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-4 text-primary-foreground">
              <h2 className="line-clamp-1 text-lg font-black">{active.title}</h2>
              <Button type="button" variant="secondary" size="icon" onClick={() => setActive(null)} aria-label="إغلاق الفيديو" title="إغلاق"><X aria-hidden="true" /></Button>
            </div>
            <div className="aspect-video overflow-hidden rounded-lg bg-foreground">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${active.youtube_id}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
