import { site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import styles from "./Nav.module.css";

export default function Nav() {
  return (
    <nav className={styles.nav} aria-label="Principal">
      <div className={`container ${styles.inner}`}>
        <a href="#top" aria-label="molpo — inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/molpo-negro.png" alt="molpo" className={styles.logo} width={68} height={24} />
        </a>
        <div className={styles.links}>
          {site.nav.map((item) => (
            <a key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </a>
          ))}
          <a href={site.contact.whatsappUrl} className={styles.cta} rel="noopener">
            WhatsApp
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
