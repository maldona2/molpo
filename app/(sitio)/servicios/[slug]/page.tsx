import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getProyecto } from "@/content/portfolio";
import { getServicioDetalle, serviciosDetalle } from "@/content/services";
import { site } from "@/lib/site";
import styles from "./Servicio.module.css";

type Params = { slug: string };

function serviceUrl(slug: string) {
  return `${site.url}/servicios/${slug}/`;
}

export function generateStaticParams(): Params[] {
  return serviciosDetalle.map((servicio) => ({ slug: servicio.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const servicio = getServicioDetalle(slug);
  if (!servicio) return {};

  return {
    title: servicio.eyebrow,
    description: servicio.description,
    keywords: [servicio.eyebrow, "desarrollo de software para pymes", "software Tucumán"],
    authors: [{ name: site.founder, url: site.url }],
    alternates: {
      canonical: `/servicios/${servicio.slug}/`,
      languages: { "es-AR": `/servicios/${servicio.slug}/` },
    },
    openGraph: {
      type: "website",
      locale: site.locale,
      url: serviceUrl(servicio.slug),
      siteName: site.name,
      title: `${servicio.eyebrow} | molpo`,
      description: servicio.description,
      images: [
        {
          url: site.socialImage.openGraph,
          width: site.socialImage.width,
          height: site.socialImage.height,
          alt: site.socialImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${servicio.eyebrow} | molpo`,
      description: servicio.description,
      images: [site.socialImage.twitter],
    },
  };
}

export default async function ServicioPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const servicio = getServicioDetalle(slug);
  if (!servicio) notFound();

  const caso = getProyecto(servicio.caseSlug);
  const url = serviceUrl(servicio.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: servicio.eyebrow,
        description: servicio.description,
        url,
        areaServed: { "@type": "Country", name: "Argentina" },
        provider: { "@id": `${site.url}/#molpo` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `${servicio.eyebrow} | molpo`,
        description: servicio.description,
        inLanguage: site.lang,
        isPartOf: { "@id": `${site.url}/#website` },
        mainEntity: { "@id": `${url}#service` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Servicios", item: `${site.url}/#servicios` },
          { "@type": "ListItem", position: 3, name: servicio.eyebrow, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={styles.eyebrow}>{servicio.eyebrow}</p>
            <h1 className={styles.h1}>{servicio.title}</h1>
            <p className={styles.lead}>{servicio.lead}</p>
          </div>
        </header>

        <div className={`container ${styles.layout}`}>
          <article className={styles.article}>
            <section aria-labelledby="signals-h">
              <p className="eyebrow">Señales</p>
              <h2 id="signals-h">Cuándo conviene mirar este problema</h2>
              <ul className={styles.signalList}>
                {servicio.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="fit-h">
              <p className="eyebrow">Encaje</p>
              <h2 id="fit-h">Para quién es y para quién no</h2>
              <div className={styles.fitGrid}>
                <div className={styles.fitCard}>
                  <h3>Es una buena opción si…</h3>
                  <ul>
                    {servicio.fit.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.fitCard}>
                  <h3>No es la opción indicada si…</h3>
                  <ul>
                    {servicio.notFit.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section aria-labelledby="process-h">
              <p className="eyebrow">Proceso</p>
              <h2 id="process-h">Cómo se trabaja</h2>
              <ol className={styles.process}>
                {servicio.process.map((step, index) => (
                  <li key={step.title}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="deliverables-h">
              <p className="eyebrow">Entregables</p>
              <h2 id="deliverables-h">Qué queda al terminar una etapa</h2>
              <ul className={styles.deliverables}>
                {servicio.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </section>

            {caso ? (
              <section aria-labelledby="case-h">
                <p className="eyebrow">Caso relacionado</p>
                <div className={styles.caseCard}>
                  <div>
                    <h2 id="case-h">{caso.cliente}: {caso.card.titulo}</h2>
                    <p>{servicio.caseContext}</p>
                  </div>
                  <Link href={`/casos/${caso.slug}/`} className={styles.caseLink}>
                    Ver caso completo →
                  </Link>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="questions-h">
              <p className="eyebrow">Preguntas frecuentes</p>
              <h2 id="questions-h">Antes de empezar</h2>
              <div className={styles.questions}>
                {servicio.questions.map((item) => (
                  <div key={item.question} className={styles.question}>
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.cta} aria-labelledby="service-cta-h">
              <p className="eyebrow">Primer paso</p>
              <h2 id="service-cta-h">Podemos empezar por una conversación concreta.</h2>
              <p>{servicio.cta}</p>
              <a href={site.contact.contactPath} className={styles.ctaLink}>
                Escribime
              </a>
            </section>
          </article>

          <aside className={styles.aside} aria-label="Navegación de servicios">
            <p className={styles.asideTitle}>Servicios</p>
            <nav>
              {serviciosDetalle.map((item) => (
                <Link
                  key={item.slug}
                  href={`/servicios/${item.slug}/`}
                  aria-current={item.slug === servicio.slug ? "page" : undefined}
                >
                  {item.eyebrow}
                </Link>
              ))}
            </nav>
            <Link href="/#servicios" className={styles.backLink}>
              ← Volver a la home
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
