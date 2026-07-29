import { servicios } from "@/content/data";
import Reveal from "./Reveal";
import AnimatedHeading from "./AnimatedHeading";
import ServicioCard from "./ServicioCard";
import styles from "./Servicios.module.css";

export default function Servicios() {
  return (
    <section id="servicios" className={`container ${styles.section}`} aria-labelledby="servicios-h">
      <Reveal>
        <p className="eyebrow">Servicios</p>
      </Reveal>
      <AnimatedHeading as="h2" id="servicios-h" className={styles.h2} text="En qué te puedo ayudar" />
      <div className={styles.grid}>
        {servicios.map((s, i) => (
          <ServicioCard key={s.num} s={s} index={i} />
        ))}
      </div>
    </section>
  );
}
