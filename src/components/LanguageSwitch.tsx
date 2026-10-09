import { useEffect, useState } from "react";

type Lang = "ar" | "fr";
const KEY = "qahwati_lang";

function setCookie(lang: Lang) {
  const host = window.location.hostname;
  const v = lang === "fr" ? "/ar/fr" : "";
  const exp = lang === "fr" ? "" : ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=${v};path=/${exp}`;
  document.cookie = `googtrans=${v};path=/;domain=.${host}${exp}`;
}

function applyDir(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fr" ? "ltr" : "rtl";
}

function forceFrench() {
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    const combo = document.querySelector<HTMLSelectElement>("select.goog-te-combo");
    if (combo && combo.options.length > 1) {
      combo.value = "fr";
      combo.dispatchEvent(new Event("change"));
      clearInterval(t);
    } else if (tries > 60) clearInterval(t);
  }, 250);
}

function loadTranslator() {
  if (document.getElementById("gt-script")) return;
  (window as unknown as { gtInit: () => void }).gtInit = () => {
    const g = (window as unknown as { google: any }).google;
    new g.translate.TranslateElement({ pageLanguage: "ar", includedLanguages: "fr,ar", autoDisplay: false }, "gt-el");
    forceFrench();
  };
  const s = document.createElement("script");
  s.id = "gt-script";
  s.src = "https://translate.google.com/translate_a/element.js?cb=gtInit";
  document.body.appendChild(s);
}

export function LanguageSwitch() {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Lang) || "ar";
    setLang(saved);
    if (saved === "fr") {
      setCookie("fr");
      applyDir("fr");
      loadTranslator();
    }
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "fr" : "ar";
    localStorage.setItem(KEY, next);
    setCookie(next);
    window.location.reload();
  };

  return (
    <>
      <div id="gt-el" aria-hidden="true" style={{ position: "absolute", left: -9999, top: 0, width: 1, height: 1, overflow: "hidden" }} />
      <button
        type="button"
        onClick={toggle}
        translate="no"
        className="notranslate fixed top-3 left-16 z-[60] rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-primary shadow-md sm:left-1/2 sm:-translate-x-1/2 sm:text-sm"
        aria-label="Changer la langue / تغيير اللغة"
      >
        {lang === "ar" ? "🇫🇷 Français" : "🇲🇦 العربية"}
      </button>
    </>
  );
}
