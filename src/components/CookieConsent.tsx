import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

const KEY = "qahwati_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* storage unavailable */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-5 py-3 text-center sm:flex-row sm:text-start">
        <Cookie className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <p className="text-xs leading-6 sm:text-sm">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك. بالاستمرار في التصفح، فإنك توافق على{" "}
          <Link to="/privacy" className="font-bold text-primary underline">سياسة الخصوصية</Link> الخاصة بنا.
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-xl bg-primary px-6 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
        >
          موافق
        </button>
      </div>
    </div>
  );
}
