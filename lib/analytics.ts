export const ANALYTICS_CONSENT_KEY = "molpo_analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "molpo:analytics-consent";
export const OPEN_CONSENT_PREFERENCES_EVENT = "molpo:open-consent-preferences";

export type AnalyticsConsent = "granted" | "denied";

export type ContactMethod = "whatsapp" | "email" | "form";

export type ContactPlacement = "contact_page" | "home_form" | "final_cta" | "footer";

export type TrackingEvent =
  | {
      name: "contact_click";
      method: ContactMethod;
      placement: ContactPlacement;
    }
  | {
      name: "client_site_click";
      client: string;
      caseSlug: string;
    };

type Gtag = (command: "event", eventName: string, parameters: Record<string, string>) => void;

function getGtag(): Gtag | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { gtag?: Gtag }).gtag;
}

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function trackEvent(event: TrackingEvent) {
  if (!hasAnalyticsConsent()) return;
  const gtag = getGtag();
  if (!gtag) return;

  if (event.name === "contact_click") {
    gtag("event", event.name, {
      method: event.method,
      placement: event.placement,
    });
    return;
  }

  gtag("event", event.name, {
    client: event.client,
    case_slug: event.caseSlug,
  });
}
