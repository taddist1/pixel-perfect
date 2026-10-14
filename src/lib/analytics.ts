// Google Analytics loads only after the visitor accepts cookies.
export const CONSENT_KEY = "qahwati_cookie_consent";
const MEASUREMENT_ID: string | undefined = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

export function hasConsent() {
  try {
    return !!localStorage.getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}

export function initAnalytics() {
  if (loaded || typeof window === "undefined" || !MEASUREMENT_ID || !hasConsent()) return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
}

export function trackPageView(path: string) {
  if (loaded && window.gtag) window.gtag("event", "page_view", { page_path: path });
}
