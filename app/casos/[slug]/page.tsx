import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";
import JsonLd from "@/components/JsonLd";
import TrackedLink from "@/components/TrackedLink";
import { site } from "@/lib/site";
import { getProyecto, proyectos, type Bloque } from "@/content/portfolio";
import styles from "./Caso.module.css";

type Params = { slug: string };

function casoUrl(slug: string) {
  return `${site.url}/casos/${slug}/`;
}

export function generateStaticParams(): Params[] {
  return proyectos.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const proyecto = getProyecto(slug);
  if (!proyecto) return {};
  const title = `${proyecto.cliente}: ${proyecto.titulo}`;
  return {
    title,
    description: proyecto.lead,
    keywords: [
      `caso de éxito ${proyecto.cliente}`,
      proyecto.titulo,
      "desarrollo de software a medida",
      "portfolio de desarrollo de software",
    ],
    authors: [{ name: site.founder, url: site.url }],
    alternates: {
      canonical: `/casos/${proyecto.slug}/`,
      languages: { "es-AR": `/casos/${proyecto.slug}/` },
    },
    openGraph: {
      type: "article",
      locale: site.locale,
      url: casoUrl(proyecto.slug),
      siteName: site.name,
      title: `${title} | molpo`,
      description: proyecto.lead,
      authors: [`${site.url}/#matias`],
      section: "Casos de éxito",
      tags: [...proyecto.card.tags],
      images: [
        {
          url: site.socialImage.openGraph,
          width: site.socialImage.width,
          height: site.socialImage.height,
          alt: site.socialImage.alt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | molpo`,
      description: proyecto.lead,
      images: [
        {
          url: site.socialImage.twitter,
          width: site.socialImage.width,
          height: site.socialImage.height,
          alt: site.socialImage.alt,
        },
      ],
    },
  };
}

function Bloques({ bloques }: { bloques: readonly Bloque[] }) {
  return (
    <>
      {bloques.map((b, i) => {
        switch (b.tipo) {
          case "p":
            return <p key={i}>{b.texto}</p>;
          case "lista": {
            const items = b.items.map((item, j) => <li key={j}>{item}</li>);
            return b.ordenada ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case "cita":
            return (
              <blockquote key={i} className={styles.quote}>
                <p>{b.texto}</p>
              </blockquote>
            );
          case "sub":
            return (
              <div key={i}>
                <h3>{b.titulo}</h3>
                <Bloques bloques={b.bloques} />
              </div>
            );
        }
      })}
    </>
  );
}

export default async function CasoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const proyecto = getProyecto(slug);
  if (!proyecto) notFound();

  const wa = site.contact.whatsappUrl;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${casoUrl(proyecto.slug)}#caso`,
        name: `${proyecto.cliente}: ${proyecto.titulo}`,
        headline: proyecto.titulo,
        description: proyecto.lead,
        url: casoUrl(proyecto.slug),
        inLanguage: site.lang,
        genre: "Caso de estudio",
        mainEntityOfPage: { "@id": `${casoUrl(proyecto.slug)}#webpage` },
        creator: { "@id": `${site.url}/#matias` },
        author: { "@id": `${site.url}/#matias` },
        publisher: { "@id": `${site.url}/#molpo` },
      },
      {
        "@type": "WebPage",
        "@id": `${casoUrl(proyecto.slug)}#webpage`,
        url: casoUrl(proyecto.slug),
        name: `${proyecto.cliente}: ${proyecto.titulo} | ${site.name}`,
        description: proyecto.lead,
        inLanguage: site.lang,
        isPartOf: { "@id": `${site.url}/#website` },
        mainEntity: { "@id": `${casoUrl(proyecto.slug)}#caso` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${casoUrl(proyecto.slug)}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Casos", item: `${site.url}/#casos` },
          {
            "@type": "ListItem",
            position: 3,
            name: proyecto.cliente,
            item: casoUrl(proyecto.slug),
          },
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
            <p className={`eyebrow ${styles.eyebrowLight}`}>Caso · {proyecto.cliente}</p>
            <h1 className={styles.h1}>{proyecto.titulo}</h1>
            <p className={styles.lead}>{proyecto.lead}</p>
            <ul className={styles.ficha}>
              {proyecto.ficha.map((f) => (
                <li key={f.label} className={styles.fichaItem}>
                  <div className={styles.fichaLabel}>{f.label}</div>
                  <div className={styles.fichaValor}>
                    {f.url ? (
                      <TrackedLink
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        tracking={{ name: "client_site_click", client: proyecto.cliente, caseSlug: proyecto.slug }}
                      >
                        {f.valor}
                      </TrackedLink>
                    ) : (
                      f.valor
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <article className={styles.article}>
          <div className={`container ${styles.prose}`}>
            {proyecto.secciones.map((s) => (
              <section key={s.titulo}>
                <h2>{s.titulo}</h2>
                <Bloques bloques={s.bloques} />
              </section>
            ))}

            <h2>Stack tecnológico</h2>
            <div className={styles.stackGrid}>
              {proyecto.stack.map((g) => (
                <div key={g.area} className={styles.stackArea}>
                  <div className={styles.stackAreaTitulo}>{g.area}</div>
                  <div className={styles.stackChips}>
                    {g.items.map((item) => (
                      <span key={item} className={styles.stackChip}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {proyecto.frase ? (
              <blockquote className={styles.quote}>
                <p>{proyecto.frase}</p>
              </blockquote>
            ) : null}

            <div className={styles.ctaRow}>
              <TrackedLink
                href={wa}
                className={styles.cta}
                rel="noopener"
                tracking={{ name: "contact_click", method: "whatsapp", placement: "case_end" }}
              >
                <span className={styles.dot} aria-hidden="true" />
                Quiero un sistema así para mi negocio
              </TrackedLink>
            </div>

            <Link href="/#casos" className={styles.volver}>
              ← Volver a todos los casos
            </Link>
          </div>
        </article>
      </main>
      <Footer />
      <FloatingWa />
    </>
  );
}
