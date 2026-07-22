"use client";

import { OPEN_CONSENT_PREFERENCES_EVENT } from "@/lib/analytics";

export default function ConsentPreferencesButton({
  enabled,
  className,
}: {
  enabled: boolean;
  className?: string;
}) {
  if (!enabled) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_PREFERENCES_EVENT))}
    >
      Preferencias de analítica
    </button>
  );
}
