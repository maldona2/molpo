import styles from "./TrustStrip.module.css";

export default function TrustStrip() {
  return (
    <section className={styles.wrap} aria-label="Cómo se respalda el trabajo de molpo">
      <div className={`container ${styles.grid}`}>
        <div className={styles.item}>
          <strong className={styles.value}>De punta a punta</strong>
          <span className={styles.label}>del diseño a producción</span>
        </div>
        <div className={styles.item}>
          <strong className={styles.value}>Trato directo</strong>
          <span className={styles.label}>con quien diseña y construye</span>
        </div>
        <div className={styles.item}>
          <strong className={styles.value}>Por etapas</strong>
          <span className={styles.label}>con entregas que se pueden verificar</span>
        </div>
      </div>
    </section>
  );
}
