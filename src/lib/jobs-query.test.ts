import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { from, select, eq, order, limit, gt } = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), gt: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { openJobsQueryOptions } from "./jobs-query";

describe("open opportunities shared query", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue({ select });
    select.mockReturnValue({ eq });
    eq.mockReturnValue({ order });
    order.mockReturnValue({ limit });
  });

  it("returns two available opportunities for both the homepage count and list", async () => {
    limit.mockResolvedValue({ data: [{ id: "first" }, { id: "second" }], count: 2, error: null });
    const options = openJobsQueryOptions();
    const result = await options.queryFn?.({} as never);
    expect(result).toEqual({ jobs: [{ id: "first" }, { id: "second" }], count: 2 });
    expect(eq).toHaveBeenCalledWith("is_filled", false);
    expect(select).toHaveBeenCalledWith("*", { count: "exact" });
  });

  it("does not turn a failed request into zero opportunities", async () => {
    const error = new Error("network unavailable");
    limit.mockResolvedValue({ data: null, count: null, error });
    await expect(openJobsQueryOptions().queryFn?.({} as never)).rejects.toThrow("network unavailable");
  });

  it("does not turn a missing count into zero opportunities", async () => {
    limit.mockResolvedValue({ data: [{ id: "first" }, { id: "second" }], count: null, error: null });
    await expect(openJobsQueryOptions().queryFn?.({} as never)).rejects.toThrow("تعذّر تحميل عدد الفرص");
  });

  it("keeps a real empty result as zero", async () => {
    limit.mockResolvedValue({ data: [], count: 0, error: null });
    expect(await openJobsQueryOptions().queryFn?.({} as never)).toEqual({ jobs: [], count: 0 });
  });

  it("uses the selected city for both its count and list", async () => {
    limit.mockReturnValue({ eq });
    eq.mockReturnValueOnce({ order }).mockResolvedValueOnce({ data: [{ id: "city-job" }], count: 1, error: null });
    const result = await openJobsQueryOptions("الصويرة").queryFn?.({} as never);
    expect(eq).toHaveBeenCalledWith("city", "الصويرة");
    expect(result).toEqual({ jobs: [{ id: "city-job" }], count: 1 });
  });

  it("filters weekly opportunities to the previous seven days", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    limit.mockReturnValue({ gt });
    gt.mockResolvedValue({ data: [], count: 0, error: null });
    await openJobsQueryOptions("", { recentDays: 7 }).queryFn?.({} as never);
    expect(gt).toHaveBeenCalledWith("created_at", new Date(now - 7 * 864e5).toISOString());
    vi.restoreAllMocks();
  });

  it("counts all new guest opportunities even when only ten are previewed", async () => {
    const since = "2026-11-17T14:04:00.000Z";
    limit.mockReturnValue({ gt });
    gt.mockResolvedValue({ data: Array.from({ length: 10 }, (_, i) => ({ id: String(i) })), count: 12, error: null });
    const result = await openJobsQueryOptions("", { since, limit: 10 }).queryFn?.({} as never);
    expect(gt).toHaveBeenCalledWith("created_at", since);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result?.count).toBe(12);
    expect(result?.jobs).toHaveLength(10);
  });

  it("refreshes the homepage count and list after a job closes", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    limit.mockResolvedValueOnce({ data: [{ id: "first" }, { id: "second" }], count: 2, error: null })
      .mockResolvedValueOnce({ data: [{ id: "first" }], count: 1, error: null });
    const options = openJobsQueryOptions();
    expect((await client.fetchQuery(options)).count).toBe(2);
    await client.invalidateQueries({ queryKey: ["jobs"] });
    expect(await client.fetchQuery(options)).toEqual({ jobs: [{ id: "first" }], count: 1 });
    client.clear();
  });
});