import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";
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
    alternates: { canonical: `/casos/${proyecto.slug}/` },
    openGraph: {
      type: "article",
      url: casoUrl(proyecto.slug),
      title: `${title} | molpo`,
      description: proyecto.lead,
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
        description: proyecto.lead,
        url: casoUrl(proyecto.slug),
        inLanguage: site.lang,
        creator: { "@id": `${site.url}/#matias` },
        publisher: { "@id": `${site.url}/#molpo` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        {f.valor}
                      </a>
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
              <a href={wa} className={styles.cta} rel="noopener">
                <span className={styles.dot} aria-hidden="true" />
                Quiero un sistema así para mi negocio
              </a>
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
