import styles from "./SobreMi.module.css";

export default function SobreMi() {
  return (
    <section className={styles.wrap} aria-labelledby="sobremi-h">
      <div className={`container ${styles.inner}`}>
        <div>
          <p className="eyebrow">Sobre mí</p>
          <h2 id="sobremi-h" className={styles.h2}>
            Matías Maldonado
          </h2>
          <p className={styles.role}>Desarrollador de Software · molpo</p>
          <p className={styles.bio}>
            molpo es mi estudio unipersonal. Trabajo directamente con pymes que ya tienen sistemas
            internos y necesitan que dejen de fallar. Yo hago el diagnóstico, diseño la solución y
            acompaño la construcción: no hay una cadena de intermediarios entre el problema y quien
            toma las decisiones técnicas.
          </p>
          <p className={styles.bio}>
            Mi enfoque es entender el proceso real, ordenar los datos y construir sobre bases que
            aguanten el crecimiento. Cerca del cliente, transparente y sin promesas que no se puedan
            sostener.
          </p>
        </div>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/simbolo-blanco.png" alt="" aria-hidden="true" className={styles.symbol} />
          </div>
        </div>
      </div>
    </section>
  );
}
