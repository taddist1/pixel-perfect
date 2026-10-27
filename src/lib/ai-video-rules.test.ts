import { describe, expect, it } from "vitest";
import { aiVideoCategories, clampDuration, sceneCount } from "./ai-video-rules";

describe("ai video rules", () => {
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
});
