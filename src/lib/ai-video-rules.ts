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
