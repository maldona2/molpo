import { site } from "@/lib/site";
import TrackedLink from "./TrackedLink";
import styles from "./FloatingWa.module.css";

export default function FloatingWa() {
  if (!site.showFloatingWa) return null;
  return (
    <TrackedLink
      href={site.contact.whatsappUrl}
      className={styles.fab}
      rel="noopener"
      aria-label="Escribime por WhatsApp"
      tracking={{ name: "contact_click", method: "whatsapp", placement: "floating" }}
    >
      <span className={styles.dot} aria-hidden="true" />
      WhatsApp
    </TrackedLink>
  );
}
