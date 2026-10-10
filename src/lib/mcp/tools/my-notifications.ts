import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_notifications",
  title: "My notifications",
  description: "List the signed-in user's latest notifications.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("notifications")
      .select("id,title,body,url,created_at,read_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const notifications = (data ?? []).map((n) => ({ ...n }));
    return { content: [{ type: "text", text: JSON.stringify(notifications) }], structuredContent: { notifications } };
  },
});
