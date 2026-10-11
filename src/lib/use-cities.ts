import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cities as fallback } from "@/lib/constants";

export const citiesQueryKey = ["cities"] as const;

/** City list managed by admins in /admin/settings; falls back to the built-in list. */
export function useCities(): string[] {
  const { data } = useQuery({
    queryKey: citiesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("name").order("sort_order").order("name");
      if (error) throw error;
      return data.map((c) => c.name);
    },
    staleTime: 5 * 60_000,
  });
  return data && data.length ? data : fallback;
}
