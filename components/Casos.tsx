import Link from "next/link";
import { proyectos } from "@/content/portfolio";
import styles from "./Casos.module.css";

export default function Casos() {
  return (
    <section id="casos" className={`container ${styles.section}`} aria-labelledby="casos-h">
      <p className="eyebrow">Casos</p>
      <h2 id="casos-h" className={styles.h2}>
        Proyectos reales, en uso
      </h2>
      <div className={styles.grid}>
        {proyectos.map((p) => {
          const dark = p.card.variant === "dark";
          return (
            <Link
              key={p.slug}
              href={`/casos/${p.slug}/`}
              className={`${styles.card} ${dark ? styles.dark : styles.light}`}
            >
              <div
                className={`${styles.watermark} ${dark ? styles.wmDark : styles.wmLight}`}
                aria-hidden="true"
              />
              <div className={styles.cliente}>{p.cliente}</div>
              <h3 className={styles.cardTitle}>{p.card.titulo}</h3>
              <p className={styles.cardText}>{p.card.texto}</p>
              <div className={styles.tags}>
                {p.card.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
              <span className={styles.verCaso}>Ver caso completo →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
