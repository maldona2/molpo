// Structured data (JSON-LD) para SEO tradicional + GEO (motores generativos / LLMs).
import { site } from "./site";
import { servicios } from "@/content/data";

export function jsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${site.url}/#matias`,
    name: site.founder,
    jobTitle: site.jobTitle,
    worksFor: { "@id": `${site.url}/#molpo` },
    url: site.url,
  };

  const professionalService = {
    "@type": "ProfessionalService",
    "@id": `${site.url}/#molpo`,
    name: site.name,
    description: site.description,
    url: site.url,
    slogan: site.tagline,
    telephone: site.contact.whatsappNumber,
    email: site.contact.email,
    priceRange: "$$",
    areaServed: [
      { "@type": "AdministrativeArea", name: "Tucumán" },
      { "@type": "Country", name: "Argentina" },
    ],
    address: {
      "@type": "PostalAddress",
      addressRegion: "Tucumán",
      addressCountry: "AR",
    },
    founder: { "@id": `${site.url}/#matias` },
    sameAs: [site.contact.web],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios de desarrollo de software",
      itemListElement: servicios.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.titulo,
          description: s.texto,
          provider: { "@id": `${site.url}/#molpo` },
        },
      })),
    },
  };

  const webSite = {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    inLanguage: site.lang,
    publisher: { "@id": `${site.url}/#molpo` },
  };

  const webPage = {
    "@type": "WebPage",
    "@id": `${site.url}/#webpage`,
    url: site.url,
    name: `${site.name} — ${site.jobTitle} para pymes`,
    description: site.description,
    inLanguage: site.lang,
    isPartOf: { "@id": `${site.url}/#website` },
    about: { "@id": `${site.url}/#molpo` },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [professionalService, person, webSite, webPage],
  };
}
