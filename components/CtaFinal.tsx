import { site } from "@/lib/site";
import TrackedLink from "./TrackedLink";
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
          Contame qué sistema tenés, qué está fallando y qué impacto genera. Te respondo personalmente
          para entender el contexto y decirte cuál sería el próximo paso. Si no te puedo ayudar, te lo
          digo.
        </p>
        <div className={styles.ctas}>
          <TrackedLink
            href={site.contact.whatsappUrl}
            className={styles.ctaPrimary}
            rel="noopener"
            tracking={{ name: "contact_click", method: "whatsapp", placement: "final_cta" }}
          >
            <span className={styles.dot} aria-hidden="true" />
            Escribime por WhatsApp
          </TrackedLink>
          <TrackedLink
            href={`mailto:${site.contact.email}`}
            className={styles.ctaSecondary}
            tracking={{ name: "contact_click", method: "email", placement: "final_cta" }}
          >
            {site.contact.email}
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
