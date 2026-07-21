import { site } from "@/lib/site";
import styles from "./FloatingWa.module.css";

export default function FloatingWa() {
  if (!site.showFloatingWa) return null;
  return (
    <a
      href={site.contact.whatsappUrl}
      className={styles.fab}
      rel="noopener"
      aria-label="Escribime por WhatsApp"
    >
      <span className={styles.dot} aria-hidden="true" />
      WhatsApp
    </a>
  );
}
