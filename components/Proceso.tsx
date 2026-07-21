import { pasos } from "@/content/data";
import styles from "./Proceso.module.css";

export default function Proceso() {
  return (
    <section id="proceso" className={styles.wrap} aria-labelledby="proceso-h">
      <div className={`container ${styles.inner}`}>
        <p className="eyebrow">Cómo trabajo</p>
        <h2 id="proceso-h" className={styles.h2}>
          Sin humo. Con evidencia.
        </h2>
        <p className={styles.intro}>
          Si algo no te sirve, te lo digo. Prefiero un diagnóstico honesto y una base ordenada antes
          que prometer una demo linda.
        </p>
        <ol className={styles.grid}>
          {pasos.map((p) => (
            <li key={p.paso} className={styles.step}>
              <div className={styles.stepNum}>{p.paso}</div>
              <h3 className={styles.stepTitle}>{p.titulo}</h3>
              <p className={styles.stepText}>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
