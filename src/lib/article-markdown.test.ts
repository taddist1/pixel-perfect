import { describe, expect, it } from "vitest";
import { articleUrlTransform } from "./article-markdown";

describe("article image URL safety", () => {
  it("allows encoded SVG illustrations as image sources", () => {
    const url = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E";
    expect(articleUrlTransform(url, "src")).toBe(url);
  });
  it("does not allow data URLs as clickable links", () => {
    expect(articleUrlTransform("data:image/svg+xml,%3Csvg/%3E", "href")).toBe("");
  });
  it("blocks HTML payloads in image URLs", () => {
    expect(articleUrlTransform("data:text/html,%3Cscript%3E", "src")).toBe("");
  });
  it("blocks executable links", () => {
    expect(articleUrlTransform("javascript:alert(1)", "href")).toBe("");
  });
  it("keeps ordinary HTTPS image URLs", () => {
    expect(articleUrlTransform("https://kahwaty.online/photo.jpg", "src")).toBe("https://kahwaty.online/photo.jpg");
  });
});