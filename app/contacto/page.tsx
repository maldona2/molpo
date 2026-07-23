import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { contactPageJsonLd } from "@/lib/jsonld";
import styles from "./Contacto.module.css";

const title = "Contacto";
const description =
  "Contame qué sistema tenés y qué necesitás. Te respondo personalmente por email.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/contacto/",
    languages: { "es-AR": "/contacto/" },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: `${site.url}/contacto/`,
    siteName: site.name,
    title: `${title} | molpo`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | molpo`,
    description,
  },
};

export default function ContactoPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrow}`}>Contacto</p>
            <h1 className={styles.h1}>Hablemos de tu sistema.</h1>
            <p className={styles.lead}>
              Contame qué tenés hoy, qué está fallando y qué impacto genera. Te respondo
              personalmente para entender el contexto y decirte cuál sería el próximo paso.
            </p>
          </div>
        </header>
        <section className={styles.body} aria-label="Formulario de contacto">
          <div className={`container ${styles.grid}`}>
            <ContactForm placement="contact_page" />
            <aside className={styles.alternativas}>
              <h2 className={styles.altTitle}>Otras vías</h2>
              <p className={styles.altItem}>
                Email directo:{" "}
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              </p>
              <p className={styles.altItemSecundario}>
                Teléfono: <a href={site.contact.whatsappUrl} rel="noopener">{site.contact.phoneDisplay}</a>
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
