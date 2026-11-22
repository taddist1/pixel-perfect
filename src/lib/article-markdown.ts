import { defaultUrlTransform } from "react-markdown";

/** Inline diagrams are images, never HTML or navigable data URLs. */
export function articleUrlTransform(url: string, key: string): string {
  if (key === "src" && /^data:image\/(?:svg\+xml|png|jpe?g|gif|webp)(?:;base64)?,/i.test(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}