import { site } from "@/lib/site";
import HeroMenu from "./HeroMenu";
import ThemeToggle from "./ThemeToggle";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <header id="top" className={styles.hero}>
      <div className={styles.card}>
        <div className={styles.mesh} aria-hidden="true">
          <span className={`${styles.blob} ${styles.blobLight}`} />
          <span className={`${styles.blob} ${styles.blobDark}`} />
          <span className={`${styles.blob} ${styles.blobDeep}`} />
        </div>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.topBar}>
          <a href="/" aria-label="molpo — inicio" className={styles.logoLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/molpo-blanco.svg" alt="molpo" className={styles.logo} width={97} height={26} />
          </a>
          <nav className={styles.pillNav} aria-label="Principal">
            {site.nav.map((item) => (
              <a key={item.href} href={item.href} className={styles.pillLink}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.topActions}>
            <ThemeToggle className={styles.themeToggle} />
            <a href={site.contact.contactPath} className={styles.contactBtn}>
              Contacto
            </a>
            <HeroMenu />
          </div>
        </div>

        <div className={styles.headline}>
          <p className={styles.eyebrow}>Desarrollo de software · Tucumán</p>
          <h1 className={styles.h1}>
            Software que sostiene
            <br />
            tu empresa
          </h1>
          <p className={styles.sub}>
            Desarrollo a medida, rescate de sistemas hechos con IA e integración de datos — para
            pymes que dependen de su software todos los días.
          </p>
        </div>

        <div className={styles.orbit} aria-hidden="false">
          <div className={`${styles.ring} ${styles.ring2}`} aria-hidden="true" />
          <div className={`${styles.ring} ${styles.ring3}`} aria-hidden="true" />
          <div className={`${styles.ring} ${styles.ring4}`} aria-hidden="true" />
          <div className={styles.orbitDot} aria-hidden="true" />
          <a href={site.contact.contactPath} className={styles.orbitCta}>
            Empecemos hoy
            <span className={styles.arrowCircle} aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EAF3FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
