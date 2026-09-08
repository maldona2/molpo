import { testimonios } from "@/content/testimonios";
import styles from "./Testimonios.module.css";

export default function Testimonios() {
  if (testimonios.length === 0) return null;

  return (
    <section className={styles.wrap} aria-labelledby="testimonios-h">
      <div className={`container ${styles.inner}`}>
        <p className="eyebrow">Testimonios</p>
        <h2 id="testimonios-h" className={styles.h2}>
          Lo que dicen los clientes
        </h2>
        <div className={styles.grid}>
          {testimonios.map((t) => (
            <figure key={`${t.name}-${t.company}`} className={styles.card}>
              <blockquote className={styles.quote}>“{t.quote}”</blockquote>
              <figcaption className={styles.autor}>
                <span className={styles.nombre}>{t.name}</span>
                <span className={styles.meta}>
                  {t.role ? `${t.role}, ` : ""}
                  {t.company} · {t.trabajo}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
