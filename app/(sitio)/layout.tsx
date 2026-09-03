import JsonLd from "@/components/JsonLd";
import Analytics from "@/components/Analytics";
import ConsentBanner from "@/components/ConsentBanner";
import { siteJsonLd } from "@/lib/jsonld";

/**
 * Chrome del sitio público. Analítica, consentimiento y JSON-LD viven acá y no
 * en la raíz para que no se cuelen en app.molpo.ar: hasta ahora el cliente veía
 * el cartel de cookies encima del formulario de soporte.
 */
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <Analytics measurementId={measurementId} />
      {children}
      <ConsentBanner enabled={Boolean(measurementId)} />
    </>
  );
}
