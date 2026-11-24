import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, select, eq, order, limit } = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
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
});