export const AI_VIDEO_MAX_SECONDS = 180;
export const AI_VIDEO_MIN_SECONDS = 10;
export const AI_VIDEO_SCENE_SECONDS = 10;
export const aiVideoCategories = ["القهوة", "الصيانة", "الباريستا", "النادل"] as const;

export function clampDuration(seconds: number) {
  return Math.min(AI_VIDEO_MAX_SECONDS, Math.max(AI_VIDEO_MIN_SECONDS, Math.round(seconds)));
}

export function sceneCount(seconds: number) {
  return Math.ceil(clampDuration(seconds) / AI_VIDEO_SCENE_SECONDS);
}

/** Distributes a manually written narration across `parts` scenes, keeping sentence order. */
export function splitNarration(text: string, parts: number): string[] {
  const n = Math.max(1, parts);
  let units = text.split(/(?<=[.!؟?…])|\n+/).map((s) => s.trim()).filter(Boolean);
  if (units.length < n) units = text.split(/\s+/).filter(Boolean);
  const total = units.reduce((sum, u) => sum + u.split(/\s+/).length, 0) || 1;
  const target = total / n;
  const out: string[] = [];
  let current: string[] = [];
  let weight = 0;
  for (const unit of units) {
    if (current.length > 0 && out.length < n - 1 && weight >= target) {
      out.push(current.join(" "));
      current = [];
      weight = 0;
    }
    current.push(unit);
    weight += unit.split(/\s+/).length;
  }
  out.push(current.join(" "));
  while (out.length < n) out.push("");
  return out.slice(0, n).map((s) => s.trim());
}
