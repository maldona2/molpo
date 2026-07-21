import { site } from "@/lib/site";
import styles from "./CtaFinal.module.css";

export default function CtaFinal() {
  return (
    <section className={styles.wrap} aria-labelledby="cta-h">
      <div className={styles.watermark} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <h2 id="cta-h" className={styles.h2}>
          Hablemos de tu sistema.
        </h2>
        <p className={styles.sub}>
          Contame qué tenés hoy y qué te gustaría que hiciera. Sin compromiso: si no te puedo ayudar,
          te lo digo.
        </p>
        <div className={styles.ctas}>
          <a href={site.contact.whatsappUrl} className={styles.ctaPrimary} rel="noopener">
            <span className={styles.dot} aria-hidden="true" />
            Escribime por WhatsApp
          </a>
          <a href={`mailto:${site.contact.email}`} className={styles.ctaSecondary}>
            {site.contact.email}
          </a>
        </div>
      </div>
    </section>
  );
}
