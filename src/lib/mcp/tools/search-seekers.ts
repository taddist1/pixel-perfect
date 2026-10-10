import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_seekers",
  title: "Search talent",
  description: "List registered café workers (baristas, waiters, technicians), optionally filtered by city, profession or availability.",
  inputSchema: {
    city: z.string().trim().max(60).optional(),
    profession: z.string().trim().max(60).optional(),
    available_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, profession, available_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("public_seekers")
      .select("id,full_name,profession,city,experience_years,is_available,skills")
      .limit(limit ?? 20);
    if (city) q = q.eq("city", city);
    if (profession) q = q.ilike("profession", `%${profession}%`);
    if (available_only) q = q.eq("is_available", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const seekers = (data ?? []).map((s) => ({ ...s, skills: s.skills ?? [] }));
    return { content: [{ type: "text", text: JSON.stringify(seekers) }], structuredContent: { seekers } };
  },
});
