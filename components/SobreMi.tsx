import Reveal from "./Reveal";
import AnimatedHeading from "./AnimatedHeading";
import Parallax from "./Parallax";
import styles from "./SobreMi.module.css";

export default function SobreMi() {
  return (
    <section className={styles.wrap} aria-labelledby="sobremi-h">
      <div className={`container ${styles.inner}`}>
        <div>
          <Reveal variant="left">
            <p className="eyebrow">Sobre mí</p>
          </Reveal>
          <AnimatedHeading as="h2" id="sobremi-h" className={styles.h2} text="Matías Maldonado" />
          <Reveal variant="left" delay={100}>
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
          </Reveal>
        </div>
        <Reveal variant="right" delay={120} className={styles.avatarWrap}>
          <div className={styles.avatar}>
            <Parallax offset={28}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/simbolo-blanco.png" alt="" aria-hidden="true" className={styles.symbol} />
            </Parallax>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
