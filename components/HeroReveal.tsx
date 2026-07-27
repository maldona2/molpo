"use client";

import { useEffect, useRef } from "react";
import Hero from "./Hero";
import styles from "./HeroReveal.module.css";

/**
 * Envuelve el Hero en un "track" de scroll. Mientras se recorre ese track el
 * hero queda sticky y su marco se abre: el padding y el border-radius van a 0
 * hasta ocupar todo el viewport, dando la sensación de entrar a la pantalla.
 *
 * El progreso 0→1 se expone como la CSS var --reveal en el wrapper y cascadea
 * hacia Hero.module.css, que interpola marco/radio/altura.
 */
export default function HeroReveal() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      track.classList.add(styles.reduce);
      sticky.style.setProperty("--reveal", "0");
      return;
    }

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      // -rect.top va de 0 (arriba del track) a `total` (fin del recorrido).
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      sticky.style.setProperty("--reveal", progress.toFixed(4));
    };

    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={trackRef} className={styles.track}>
      <div ref={stickyRef} className={styles.sticky}>
        <Hero />
      </div>
    </div>
  );
}
