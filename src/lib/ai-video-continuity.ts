import type { OmniVideoFields, OmniVideoInput } from "@lovable.dev/ai-gateway";
import { z } from "zod";

export const generationConsent = z.literal(true);
export type ReferenceImage = { data: string; mime_type: "image/jpeg" | "image/png" | "image/webp" };
export const MAX_REFERENCE_BYTES = 1024 * 1024;
export const CONTINUITY = `Continuity lock for the entire lesson: the same adult Moroccan man, about 30, short curly black hair, neatly trimmed beard, white shirt and plain dark green apron. The same Moroccan cafe: dark green zellige wall, stainless steel two-group espresso machine, white counter, daylight from camera-left. Fixed eye-level medium camera, 50mm lens, identical lighting and color balance. One calm male Moroccan Darija voice, medium-low pitch, conversational pace, identical accent and microphone distance. No music, captions or text. Preserve the presenter's face, clothes, equipment placement, handedness and voice across all clips. Show a single small teaching action per clip. End with a steady natural pose, no fade, outro or abrupt camera move.`;

/** Native reference-to-video input: produce only the NEW ten seconds, not the supplied clip. */
export function continuousClipRequest(prompt: string, previousVideo?: string, referenceImage?: ReferenceImage): OmniVideoFields & { model: "google/gemini-omni-1.1-flash" } {
  const input: Exclude<OmniVideoInput, string> = [];
  if (referenceImage) input.push({ type: "image", ...referenceImage });
  if (previousVideo) input.push({ type: "video", data: previousVideo, mime_type: "video/mp4" });
  input.push({ type: "text", text: `${CONTINUITY}\n${referenceImage ? "Use the supplied image as the identity/location reference; keep its visible person and setting instead of inventing replacements.\n" : ""}${previousVideo ? "The supplied video is the immediately preceding clip. Start at its final visible pose, hand/object positions and camera framing; match its speaker voice and ambience. Produce ONLY the next 10 seconds, do not replay or include any of the supplied video.\n" : ""}Next teaching action:\n${prompt}` });
  return {
    model: "google/gemini-omni-1.1-flash",
    input,
    generation_config: { video_config: { task: previousVideo || referenceImage ? "reference_to_video" : "text_to_video" } },
    response_format: { type: "video", resolution: "720p", duration: "10s", aspect_ratio: "16:9" },
  };
}