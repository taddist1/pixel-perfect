import { Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";
import type { Tables } from "@/integrations/supabase/types";

type Video = Tables<"educational_videos">;

export function VideoCard({ video, onPlay }: { video: Video; onPlay: (video: Video) => void }) {
  const shareText = encodeURIComponent(`${video.title} — قهوتي ${youtubeWatchUrl(video.youtube_id)}`);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="group relative block aspect-video w-full overflow-hidden bg-muted text-right"
        aria-label={`شغّل ${video.title}`}
      >
        <img
          src={youtubeThumbnail(video.youtube_id)}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute inset-0 grid place-items-center bg-foreground/15 transition group-hover:bg-foreground/25">
          <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg">
            <Play className="size-6 fill-current" aria-hidden="true" />
          </span>
        </span>
      </button>
      <div className="p-4">
        <span className="text-xs font-bold text-primary">{video.category}</span>
        <h2 className="mt-1 line-clamp-2 text-lg font-black leading-7">{video.title}</h2>
        {video.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{video.description}</p>}
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => onPlay(video)} size="sm"><Play aria-hidden="true" />شاهد</Button>
          <Button asChild variant="outline" size="icon">
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer" aria-label="شارك على واتساب" title="شارك على واتساب">
              <Share2 aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
