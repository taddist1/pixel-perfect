import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

function commands() {
  return (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY", "G-FSH6HY17ER");
  localStorage.clear();
  document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((script) => script.remove());
  window.dataLayer = [];
  delete window.gtag;
  vi.stubGlobal("location", { hostname: "kahwaty.online", origin: "https://kahwaty.online" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Analytics accuracy", () => {
  it("disables the automatic initial view and records one view per route visit", async () => {
    const { initAnalytics, trackPageView } = await import("./analytics");
    initAnalytics();
    initAnalytics();
    trackPageView("/");
    trackPageView("/");
    trackPageView("/jobs");
    trackPageView("/jobs");
    trackPageView("/");
    expect(commands().filter(([name]) => name === "config")).toEqual([
      ["config", "G-FSH6HY17ER", { send_page_view: false }],
    ]);
    expect(commands().filter(([name, event]) => name === "event" && event === "page_view").map(([, , params]) => (params as { page_path: string }).page_path)).toEqual(["/", "/jobs", "/"]);
    expect(document.head.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
  });

  it("keeps analytics storage denied until acceptance without another page view", async () => {
    const { CONSENT_KEY, initAnalytics, trackPageView } = await import("./analytics");
    initAnalytics();
    trackPageView("/");
    expect(commands()[0]).toEqual(["consent", "default", {
      analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    }]);
    localStorage.setItem(CONSENT_KEY, "accepted");
    initAnalytics();
    expect(commands()).toContainEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(commands().filter(([name]) => name === "event")).toHaveLength(1);
  });

  it.each(["localhost", "id-preview--example.lovable.app"])("excludes %s from live reports", async (hostname) => {
    vi.stubGlobal("location", { hostname, origin: `https://${hostname}` });
    const { initAnalytics, trackPageView } = await import("./analytics");
    initAnalytics();
    trackPageView("/");
    expect(commands()).toEqual([]);
    expect(document.head.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(0);
  });
});