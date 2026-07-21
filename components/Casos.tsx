import { casos } from "@/content/data";
import styles from "./Casos.module.css";

export default function Casos() {
  return (
    <section id="casos" className={`container ${styles.section}`} aria-labelledby="casos-h">
      <p className="eyebrow">Casos</p>
      <h2 id="casos-h" className={styles.h2}>
        Proyectos reales, en uso
      </h2>
      <div className={styles.grid}>
        {casos.map((c) => {
          const dark = c.variant === "dark";
          return (
            <article
              key={c.cliente}
              className={`${styles.card} ${dark ? styles.dark : styles.light}`}
            >
              <div
                className={`${styles.watermark} ${dark ? styles.wmDark : styles.wmLight}`}
                aria-hidden="true"
              />
              <div className={styles.cliente}>{c.cliente}</div>
              <h3 className={styles.cardTitle}>{c.titulo}</h3>
              <p className={styles.cardText}>{c.texto}</p>
              <div className={styles.tags}>
                {c.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
