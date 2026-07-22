"use client";

import { useEffect } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  type AnalyticsConsent,
} from "@/lib/analytics";

type DataLayerItem = IArguments | unknown[];
type AnalyticsWindow = Window & {
  dataLayer?: DataLayerItem[];
  gtag?: (...args: unknown[]) => void;
};

function removeAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name && /^_ga(?:_|$)/.test(name)));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}; SameSite=Lax`;
  }
}

function loadGoogleAnalytics(measurementId: string) {
  const analyticsWindow = window as AnalyticsWindow;
  if (document.getElementById("molpo-google-analytics")) return;

  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  analyticsWindow.gtag = function gtag(...args: unknown[]) {
    analyticsWindow.dataLayer?.push(args);
  };

  analyticsWindow.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  analyticsWindow.gtag("consent", "update", { analytics_storage: "granted" });
  analyticsWindow.gtag("js", new Date());
  analyticsWindow.gtag("config", measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.id = "molpo-google-analytics";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export default function Analytics({ measurementId }: { measurementId?: string }) {
  useEffect(() => {
    if (!measurementId) return;

    try {
      if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted") {
        loadGoogleAnalytics(measurementId);
      }
    } catch {
      return;
    }

    function handleConsent(event: Event) {
      const consent = (event as CustomEvent<AnalyticsConsent>).detail;
      if (consent === "granted") {
        loadGoogleAnalytics(measurementId as string);
        return;
      }

      const analyticsWindow = window as AnalyticsWindow;
      analyticsWindow.gtag?.("consent", "update", { analytics_storage: "denied" });
      removeAnalyticsCookies();

      if (document.getElementById("molpo-google-analytics")) {
        window.location.reload();
      }
    }

    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
  }, [measurementId]);

  return null;
}
