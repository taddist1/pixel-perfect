import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { sitemapStaticPaths, sitemapXML, sitemapPathForLocation, isSitemapRouteIncluded, type SitemapEntry } from "@/lib/sitemap";
import { articles } from "@/lib/articles";

// The public site origin users see (kahwaty.online custom domain).
const BASE_URL = "https://kahwaty.online";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        if (!BASE_URL) {
          return new Response("Sitemap domain not configured", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        // Static blog articles (code-backed collection).
        const blogRoute = router.routesById["/blog/$slug"];
        if (isSitemapRouteIncluded(blogRoute)) {
          for (const a of articles) {
            const location = router.buildLocation({ to: "/blog/$slug", params: { slug: a.slug }, search: () => ({}), hash: "" });
            const path = sitemapPathForLocation(router, location, "/blog/$slug");
            if (path) entries.push({ path, lastmod: a.date });
          }

          // Published articles from the admin drafts collection (public, paginated).
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
          const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const pageSize = 1000;
          for (let offset = 0; ; ) {
            const { data, error } = await supabase
              .from("article_drafts")
              .select("slug, published_at")
              .eq("is_published", true)
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              if (!row.slug) continue;
              const location = router.buildLocation({ to: "/blog/$slug", params: { slug: row.slug }, search: () => ({}), hash: "" });
              const path = sitemapPathForLocation(router, location, "/blog/$slug");
              if (path) entries.push({ path, lastmod: row.published_at ?? undefined });
            }
            offset += data.length;
          }
        }

        // Admin-managed cities -> /cities/$city pages.
        const cityRoute = router.routesById["/cities/$city"];
        if (isSitemapRouteIncluded(cityRoute)) {
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
          const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const pageSize = 1000;
          for (let offset = 0; ; ) {
            const { data, error } = await supabase.from("cities").select("name").order("name").range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              if (!row.name) continue;
              const location = router.buildLocation({ to: "/cities/$city", params: { city: row.name }, search: () => ({}), hash: "" });
              const path = sitemapPathForLocation(router, location, "/cities/$city");
              if (path) entries.push({ path });
            }
            offset += data.length;
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
