import { site } from "@/lib/site";
import ConsentPreferencesButton from "./ConsentPreferencesButton";
import TrackedLink from "./TrackedLink";
import styles from "./Footer.module.css";

export default function Footer() {
  const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/molpo-blanco.png" alt="molpo" className={styles.logo} width={73} height={26} />
        <div className={styles.links}>
          <TrackedLink
            href={site.contact.whatsappUrl}
            className={styles.link}
            rel="noopener"
            tracking={{ name: "contact_click", method: "whatsapp", placement: "footer" }}
          >
            {site.contact.phoneDisplay}
          </TrackedLink>
          <TrackedLink
            href={`mailto:${site.contact.email}`}
            className={styles.link}
            tracking={{ name: "contact_click", method: "email", placement: "footer" }}
          >
            {site.contact.email}
          </TrackedLink>
          <a href={site.contact.web} className={styles.link} rel="noopener">
            {site.contact.webDisplay}
          </a>
        </div>
      </div>
      <div className={styles.legalWrap}>
        <div className={`container ${styles.legal}`}>
          <span>molpo · Software construido sobre bases sólidas · Tucumán, Argentina</span>
          <div className={styles.legalLinks}>
            <a href="/privacidad/">Privacidad</a>
            <ConsentPreferencesButton enabled={analyticsEnabled} className={styles.preferenceButton} />
          </div>
        </div>
      </div>
    </footer>
  );
}
