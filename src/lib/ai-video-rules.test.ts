import { describe, expect, it } from "vitest";
import { aiVideoCategories, clampDuration, sceneCount, splitNarration, narrationTiming, timedNarration } from "./ai-video-rules";

describe("ai video rules", () => {
  it("automatically increases duration with narration length in ten-second clips", () => {
    expect(narrationTiming("كلمة ".repeat(20)).seconds).toBe(10);
    expect(narrationTiming("كلمة ".repeat(21)).seconds).toBe(20);
    expect(narrationTiming("كلمة ".repeat(60)).seconds).toBe(30);
  });
  it("rejects scripts over 180 seconds without shortening them silently", () => {
    expect(narrationTiming("كلمة ".repeat(360))).toMatchObject({ seconds: 180, tooLong: false });
    expect(narrationTiming("كلمة ".repeat(361)).tooLong).toBe(true);
    expect(() => timedNarration("كلمة ".repeat(361))).toThrow();
  });
  it("fits every narration part into its clip and preserves every word", () => {
    const text = Array.from({ length: 61 }, (_, i) => `كلمة${i}`).join(" ");
    const parts = timedNarration(text);
    expect(parts).toHaveLength(4);
    expect(parts.every((p) => p.split(/\s+/).length <= 20)).toBe(true);
    expect(parts.join(" ")).toBe(text);
    expect(timedNarration("خطوة قصيرة")).toEqual(["خطوة قصيرة"]);
  });
  it("caps duration at 180 seconds", () => {
    expect(clampDuration(500)).toBe(180);
    expect(sceneCount(500)).toBe(18);
  });
  it("splits 180 seconds into 18 ten-second scenes", () => {
    expect(sceneCount(180)).toBe(18);
    expect(sceneCount(45)).toBe(5);
  });
  it("only allows the platform topics", () => {
    expect([...aiVideoCategories]).toEqual(["القهوة", "الصيانة", "الباريستا", "النادل"]);
  });
  it("distributes a manual narration across all scenes without losing words", () => {
    const text = "أول حاجة طفي الآلة. من بعد حيّد الكروبات. نقّيهم بالماء السخون. عاود ركّبهم بلاسهم.";
    const parts = splitNarration(text, 2);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("طفي الآلة");
    expect(parts[1]).toContain("ركّبهم");
    expect(parts.join(" ").split(/\s+/).filter(Boolean)).toHaveLength(text.split(/\s+/).filter(Boolean).length);
  });
  it("splits by words when sentences are fewer than scenes", () => {
    const parts = splitNarration("جملة وحدة قصيرة بزاف", 3);
    expect(parts).toHaveLength(3);
    expect(parts.join(" ").trim()).toBe("جملة وحدة قصيرة بزاف");
  });
});
