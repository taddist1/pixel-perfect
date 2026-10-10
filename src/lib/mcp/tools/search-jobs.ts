import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_jobs",
  title: "Search jobs",
  description: "List open café and restaurant jobs in Morocco, optionally filtered by city or role.",
  inputSchema: {
    city: z.string().trim().max(60).optional().describe("City name in Arabic, e.g. الرباط"),
    role: z.string().trim().max(60).optional().describe("Role text to match, e.g. باريستا"),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, role, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("jobs")
      .select("id,title,role,city,business_name,schedule,salary,description,created_at")
      .eq("is_filled", false)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (city) q = q.eq("city", city);
    if (role) q = q.ilike("role", `%${role}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const jobs = (data ?? []).map((j) => ({ ...j }));
    return { content: [{ type: "text", text: JSON.stringify(jobs) }], structuredContent: { jobs } };
  },
});
