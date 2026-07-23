import { site } from "@/lib/site";
import ContactForm from "./ContactForm";
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
          Contame qué sistema tenés, qué está fallando y qué impacto genera. Te respondo
          personalmente para entender el contexto y decirte cuál sería el próximo paso. Si no te
          puedo ayudar, te lo digo.
        </p>
        <div className={styles.formWrap}>
          <ContactForm placement="home_form" compact />
        </div>
        <p className={styles.altMail}>
          O escribime directo:{" "}
          <TrackedLink
            href={`mailto:${site.contact.email}`}
            tracking={{ name: "contact_click", method: "email", placement: "final_cta" }}
          >
            {site.contact.email}
          </TrackedLink>
        </p>
      </div>
    </section>
  );
}
