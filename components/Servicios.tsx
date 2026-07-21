import { servicios } from "@/content/data";
import styles from "./Servicios.module.css";

export default function Servicios() {
  return (
    <section id="servicios" className={`container ${styles.section}`} aria-labelledby="servicios-h">
      <p className="eyebrow">Servicios</p>
      <h2 id="servicios-h" className={styles.h2}>
        En qué te puedo ayudar
      </h2>
      <div className={styles.grid}>
        {servicios.map((s) => (
          <article key={s.num} className={styles.card}>
            <div className={styles.num} aria-hidden="true">
              {s.num}
            </div>
            <h3 className={styles.cardTitle}>{s.titulo}</h3>
            <p className={styles.cardText}>{s.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
