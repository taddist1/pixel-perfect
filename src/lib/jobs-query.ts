import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function openJobsQueryOptions(city = "", filters: { recentDays?: number; since?: string; limit?: number } = {}) {
  return queryOptions({
    queryKey: ["jobs", "open", city, filters],
    queryFn: async () => {
      let query = supabase.from("jobs").select("*", { count: "exact" })
        .eq("is_filled", false).order("created_at", { ascending: false }).limit(filters.limit ?? 100);
      if (city) query = query.eq("city", city);
      const since = filters.since ?? (filters.recentDays ? new Date(Date.now() - filters.recentDays * 864e5).toISOString() : null);
      if (since) query = query.gt("created_at", since);
      const { data, count, error } = await query;
      if (error) throw error;
      if (count === null) throw new Error("تعذّر تحميل عدد الفرص");
      return { jobs: data ?? [], count };
    },
    refetchInterval: 60_000,
  });
}