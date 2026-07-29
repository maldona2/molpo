import Marquee from "./Marquee";
import styles from "./TrustStrip.module.css";

const items = [
  { value: "De punta a punta", label: "del diseño a producción" },
  { value: "Trato directo", label: "con quien diseña y construye" },
  { value: "Por etapas", label: "con entregas que se pueden verificar" },
];

export default function TrustStrip() {
  return (
    <section className={styles.wrap} aria-label="Cómo se respalda el trabajo de molpo">
      <Marquee duration={30} className={styles.marquee}>
        {items.map((it, i) => (
          <div className={styles.cell} key={i}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.item}>
              <strong className={styles.value}>{it.value}</strong>
              <span className={styles.label}>{it.label}</span>
            </span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
