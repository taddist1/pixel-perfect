// Consent Mode loads on public site hosts; cookies require explicit consent.
export const CONSENT_KEY = "qahwati_cookie_consent";
const MEASUREMENT_ID: string | undefined = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
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
export function initAnalytics() {
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
  if (typeof window === "undefined" || !loaded || !window.gtag || lastPagePath === path) return;
  lastPagePath = path;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: new URL(path, window.location.origin).href,
    page_title: document.title,
  });
}
