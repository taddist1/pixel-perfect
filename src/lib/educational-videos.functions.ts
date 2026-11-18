import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public: temporary playback links for uploaded educational videos (private bucket). */
export const getEducationalVideoUrls = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ paths: z.array(z.string().min(1).max(300).regex(/^[\w./-]+$/)).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.paths.length) return { urls: {} as Record<string, string> };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("educational-videos")
      .createSignedUrls(data.paths, 60 * 60 * 24);
    if (error) throw new Error("تعذر تجهيز روابط الفيديو.");
    const urls: Record<string, string> = {};
    (signed ?? []).forEach((s, i) => {
      if (s?.signedUrl) urls[data.paths[i]!] = s.signedUrl;
    });
    return { urls };
  });
