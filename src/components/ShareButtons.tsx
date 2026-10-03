export function ShareButtons({ text }: { text: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">شارك على واتساب</a>
      <a href={fb} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-1.5 text-sm font-bold">شارك على فيسبوك</a>
    </div>
  );
}
