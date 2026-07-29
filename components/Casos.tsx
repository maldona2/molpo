import { proyectos } from "@/content/portfolio";
import Reveal from "./Reveal";
import AnimatedHeading from "./AnimatedHeading";
import CasoCard from "./CasoCard";
import styles from "./Casos.module.css";

export default function Casos() {
  return (
    <section id="casos" className={`container ${styles.section}`} aria-labelledby="casos-h">
      <Reveal>
        <p className="eyebrow">Casos</p>
      </Reveal>
      <AnimatedHeading as="h2" id="casos-h" className={styles.h2} text="Proyectos reales, en uso" />
      <div className={styles.grid}>
        {proyectos.map((p, i) => (
          <CasoCard key={p.slug} p={p} index={i} />
        ))}
      </div>
    </section>
  );
}
