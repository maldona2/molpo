// Structured data (JSON-LD) para SEO tradicional + GEO (motores generativos / LLMs).
import { site } from "./site";
import { servicios } from "@/content/data";

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function siteJsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${site.url}/#matias`,
    name: site.founder,
    jobTitle: site.jobTitle,
    worksFor: { "@id": `${site.url}/#molpo` },
    url: site.url,
    knowsLanguage: "es",
  };

  const professionalService = {
    "@type": "ProfessionalService",
    "@id": `${site.url}/#molpo`,
    name: site.name,
    description: site.description,
    url: site.url,
    slogan: site.tagline,
    logo: {
      "@type": "ImageObject",
      url: `${site.url}/icon.svg`,
      width: 512,
      height: 512,
    },
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
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.contact.whatsappNumber,
      email: site.contact.email,
      contactType: "sales",
      areaServed: "AR",
      availableLanguage: "Spanish",
    },
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
    alternateName: site.title,
    inLanguage: site.lang,
    publisher: { "@id": `${site.url}/#molpo` },
    about: { "@id": `${site.url}/#molpo` },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [professionalService, person, webSite],
  };
}

export function homePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${site.url}/#webpage`,
    url: `${site.url}/`,
    name: site.title,
    description: site.description,
    inLanguage: site.lang,
    isPartOf: { "@id": `${site.url}/#website` },
    about: { "@id": `${site.url}/#molpo` },
    mainEntity: { "@id": `${site.url}/#molpo` },
  };
}
