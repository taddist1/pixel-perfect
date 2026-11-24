import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function openJobsQueryOptions(city = "") {
  return queryOptions({
    queryKey: ["jobs", "open", city],
    queryFn: async () => {
      let query = supabase.from("jobs").select("*", { count: "exact" })
        .eq("is_filled", false).order("created_at", { ascending: false }).limit(100);
      if (city) query = query.eq("city", city);
      const { data, count, error } = await query;
      if (error) throw error;
      if (count === null) throw new Error("تعذّر تحميل عدد الفرص");
      return { jobs: data ?? [], count };
    },
    refetchInterval: 60_000,
  });
}