import { site } from "@/lib/site";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <header id="top" className={styles.hero}>
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.sweep} aria-hidden="true" />
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.watermark} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Desarrollo de software · Tucumán</p>
        <h1 className={styles.h1}>Sistemas que sostienen tu empresa, no que la complican.</h1>
        <p className={styles.sub}>
          Desarrollo a medida, rescate de sistemas hechos con IA e integración de datos — para pymes
          que ya dependen de su software todos los días.
        </p>
        <div className={styles.ctas}>
          <a href={site.contact.whatsappUrl} className={styles.ctaPrimary} rel="noopener">
            <span className={styles.dot} aria-hidden="true" />
            Escribime por WhatsApp
          </a>
          <a href="#proceso" className={styles.ctaSecondary}>
            Cómo trabajo
          </a>
        </div>
        <p className={styles.closing}>
          Software construido sobre bases sólidas: funcional, seguro y preparado para crecer sin
          rehacerse en un año.
        </p>
      </div>
    </header>
  );
}
