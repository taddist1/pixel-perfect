import { useState } from "react";

/** Plays a list of short clips back to back as one video. */
export function ClipPlayer({ urls, autoPlay = false }: { urls: string[]; autoPlay?: boolean }) {
  const [i, setI] = useState(0);
  if (!urls.length) return null;
  return (
    <div className="space-y-1">
      <video
        key={i}
        src={urls[i]}
        controls
        playsInline
        autoPlay={autoPlay || i > 0}
        onEnded={() => setI((n) => (n + 1 < urls.length ? n + 1 : n))}
        className="aspect-video w-full rounded-lg bg-muted"
      />
      {urls.length > 1 && <p className="text-xs text-muted-foreground">الجزء {i + 1} من {urls.length}</p>}
    </div>
  );
}
