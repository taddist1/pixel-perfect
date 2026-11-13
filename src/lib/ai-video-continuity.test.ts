import { describe, expect, it, vi, beforeEach } from "vitest";
import { continuousClipRequest, generationConsent, MAX_REFERENCE_BYTES } from "./ai-video-continuity";

vi.mock("@lovable.dev/ai-gateway", () => ({
  generateVideo: vi.fn(), generateResponse: vi.fn(), getVideo: vi.fn(), downloadVideo: vi.fn(),
  GatewayError: class extends Error {},
}));
import { generateVideo, getVideo, downloadVideo } from "@lovable.dev/ai-gateway";
import { startClip, pollClip, downloadClip } from "./ai-video.server";

describe("video continuity without paid generation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps clips at ten seconds and uses the current model", () => {
    const request = continuousClipRequest("نقّي الآلة");
    expect(request.model).toBe("google/gemini-omni-1.1-flash");
    expect(request.response_format).toMatchObject({ duration: "10s", resolution: "720p" });
    expect(request.generation_config?.video_config?.task).toBe("text_to_video");
  });
  it("sends the previous clip and common image as native reference inputs", () => {
    const request = continuousClipRequest("ركّب القطعة", "cHJldmlvdXM=", { data: "aW1hZ2U=", mime_type: "image/png" });
    expect(request.input).toEqual(expect.arrayContaining([
      { type: "video", data: "cHJldmlvdXM=", mime_type: "video/mp4" },
      { type: "image", data: "aW1hZ2U=", mime_type: "image/png" },
    ]));
    expect(request.generation_config?.video_config?.task).toBe("reference_to_video");
  });
  it("caps uploaded references at one MiB", () => { expect(MAX_REFERENCE_BYTES).toBe(1048576); });
  it("rejects absent or declined paid-generation consent", () => {
    expect(generationConsent.safeParse(undefined).success).toBe(false);
    expect(generationConsent.safeParse(false).success).toBe(false);
    expect(generationConsent.safeParse(true).success).toBe(true);
  });
  it("submits the continuity payload and reads back a completed clip using mocked SDK only", async () => {
    vi.mocked(generateVideo).mockResolvedValue({ id: "job-2" } as Awaited<ReturnType<typeof generateVideo>>);
    vi.mocked(getVideo).mockResolvedValue({ status: "completed" });
    vi.mocked(downloadVideo).mockResolvedValue({ blob: async () => ({ arrayBuffer: async () => new Uint8Array([1, 2]).buffer }) } as Awaited<ReturnType<typeof downloadVideo>>);
    const id = await startClip("next action", "cHJldmlvdXM=");
    expect(generateVideo).toHaveBeenCalledTimes(1);
    expect(generateVideo).toHaveBeenCalledWith(continuousClipRequest("next action", "cHJldmlvdXM="));
    expect(await pollClip(id)).toEqual({ status: "completed", error: undefined });
    expect(new Uint8Array(await downloadClip(id))).toEqual(new Uint8Array([1, 2]));
  });
});