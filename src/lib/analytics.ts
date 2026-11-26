// Consent Mode loads on public site hosts; cookies require explicit consent.
export const CONSENT_KEY = "qahwati_cookie_consent";
const MEASUREMENT_ID: string | undefined = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void };
    _fbq?: unknown;
  }
}

let loaded = false;
let lastPagePath: string | undefined;
const PUBLIC_HOSTS = new Set(["kahwaty.online", "www.kahwaty.online", "kawaty-pro.lovable.app"]);

export function hasConsent() {
  try {
    return !!localStorage.getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}

// Consent Mode v2: the tag always loads (so Google can detect it) but
// stores no cookies until the visitor accepts.
const META_PIXEL_ID = "29593007480324635";
let pixelLoaded = false;

function initMetaPixel() {
  if (pixelLoaded || !PUBLIC_HOSTS.has(window.location.hostname)) return;
  pixelLoaded = true;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as NonNullable<Window["fbq"]> & { push?: unknown; loaded?: boolean; version?: string };
  n.queue = [];
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  window.fbq = n;
  window._fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  window.fbq("init", META_PIXEL_ID);
}

export function initAnalytics() {
  if (typeof window !== "undefined") initMetaPixel();
  if (typeof window === "undefined" || !MEASUREMENT_ID || !PUBLIC_HOSTS.has(window.location.hostname)) return;
  if (loaded) {
    if (hasConsent()) window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  const granted = hasConsent() ? "granted" : "denied";
  window.gtag("consent", "default", {
    analytics_storage: granted,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  // The router owns page views. Do not also send an automatic initial view.
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageView(path: string) {
  if (typeof window !== "undefined" && pixelLoaded && lastPagePath !== path) window.fbq?.("track", "PageView");
  if (typeof window === "undefined" || !loaded || !window.gtag || lastPagePath === path) return;
  lastPagePath = path;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: new URL(path, window.location.origin).href,
    page_title: document.title,
  });
}

export function trackSignUp(method: "email" | "phone") {
  // Initialize here as well so direct visits to registration cannot miss the tag.
  initAnalytics();
  if (typeof window === "undefined" || !loaded) return;
  window.gtag?.("event", "sign_up", { method });
}
