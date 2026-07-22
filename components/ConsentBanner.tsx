"use client";

import { useEffect, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  OPEN_CONSENT_PREFERENCES_EVENT,
  type AnalyticsConsent,
} from "@/lib/analytics";
import styles from "./ConsentBanner.module.css";

export default function ConsentBanner({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [savedConsent, setSavedConsent] = useState<AnalyticsConsent | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!enabled) return;

    let storedConsent: AnalyticsConsent | null = null;
    try {
      const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
      if (stored === "granted" || stored === "denied") storedConsent = stored;
    } catch {
      storedConsent = null;
    }

    setSavedConsent(storedConsent);
    setOpen(storedConsent === null);

    function openPreferences() {
      setOpen(true);
      window.requestAnimationFrame(() => headingRef.current?.focus());
    }

    window.addEventListener(OPEN_CONSENT_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_CONSENT_PREFERENCES_EVENT, openPreferences);
  }, [enabled]);

  function saveConsent(consent: AnalyticsConsent) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    } catch {
      // Si el almacenamiento está bloqueado, la decisión rige sólo durante esta visita.
    }
    setSavedConsent(consent);
    setOpen(false);
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }));
  }

  if (!enabled || !open) return null;

  return (
    <section className={styles.banner} aria-labelledby="consent-title" aria-describedby="consent-copy">
      <div className={styles.content}>
        <div>
          <h2 id="consent-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            Medición opcional
          </h2>
          <p id="consent-copy" className={styles.copy}>
            Con tu permiso, usamos Google Analytics para entender qué páginas ayudan y qué contactos
            reciben clics. No usamos publicidad ni cargamos la medición si rechazás.
          </p>
          <a href="/privacidad/" className={styles.details}>
            Ver política de privacidad
          </a>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => saveConsent("denied")}>
            Rechazar
          </button>
          <button type="button" className={styles.primary} onClick={() => saveConsent("granted")}>
            Aceptar analítica
          </button>
        </div>
        {savedConsent ? (
          <p className={styles.current} aria-live="polite">
            Preferencia actual: {savedConsent === "granted" ? "aceptada" : "rechazada"}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
