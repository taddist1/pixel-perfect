import { useState } from "react";

/** Plays a list of short clips back to back as one video; replay restarts from part 1. */
export function ClipPlayer({ urls, autoPlay = false }: { urls: string[]; autoPlay?: boolean }) {
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(autoPlay);
  if (!urls.length) return null;
  return (
    <div className="space-y-1">
      <video
        key={i}
        src={urls[i]}
        controls
        playsInline
        autoPlay={play}
        onPlay={() => setPlay(true)}
        onEnded={() => {
          if (i + 1 < urls.length) setI(i + 1);
          else { setPlay(false); setI(0); }
        }}
        className="aspect-video w-full rounded-lg bg-muted"
      />
      {urls.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>الجزء {i + 1} من {urls.length}</span>
          {urls.map((_, n) => (
            <button key={n} type="button" onClick={() => { setPlay(true); setI(n); }}
              className={`rounded border px-2 py-0.5 ${n === i ? "border-primary text-primary" : "border-border"}`}>
              {n + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
