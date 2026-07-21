import { site } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/molpo-celeste.svg" alt="molpo" className={styles.logo} width={100} height={26} />
        <div className={styles.links}>
          <a href={site.contact.whatsappUrl} className={styles.link} rel="noopener">
            {site.contact.phoneDisplay}
          </a>
          <a href={`mailto:${site.contact.email}`} className={styles.link}>
            {site.contact.email}
          </a>
          <a href={site.contact.web} className={styles.link} rel="noopener">
            www.molpo.com
          </a>
        </div>
      </div>
      <div className={styles.legalWrap}>
        <div className={`container ${styles.legal}`}>
          molpo · Software construido sobre bases sólidas · Tucumán, Argentina
        </div>
      </div>
    </footer>
  );
}
