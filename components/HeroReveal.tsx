"use client";

import { useEffect, useRef } from "react";
import Hero from "./Hero";
import styles from "./HeroReveal.module.css";

/**
 * Envuelve el Hero en un "track" de scroll para lograr un zoom-in cinematográfico:
 * mientras se recorre el track el hero queda sticky y, al scrollear, la card
 * primero abre su marco (padding/radio → 0) y luego vuela hacia el usuario
 * (escala creciente) desvaneciéndose, revelando el sitio detrás. Sensación de
 * atravesar la pantalla.
 *
 * A partir del progreso 0→1 se calculan tres CSS vars que cascadean a
 * Hero.module.css:
 *   --reveal        apertura del marco (marco/radio/altura)
 *   --hero-scale    escala de la card (zoom hacia adentro)
 *   --hero-opacity  desvanecimiento final de la card
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
      sticky.style.setProperty("--hero-scale", "1");
      sticky.style.setProperty("--hero-opacity", "1");
      return;
    }

    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      // -rect.top va de 0 (arriba del track) a `total` (fin del recorrido).
      const p = total > 0 ? clamp01(-rect.top / total) : 0;

      // 1) Marco: se abre rápido en el primer 22% del recorrido.
      const frame = clamp01(p / 0.22);

      // 2) Zoom: acelera hacia el final (easeIn) para dar sensación de "entrar".
      const scale = 1 + Math.pow(p, 1.7) * 1.9;

      // 3) Fade: la card recién empieza a desvanecerse pasado el 45%.
      const opacity = 1 - clamp01((p - 0.45) / 0.55);

      sticky.style.setProperty("--reveal", frame.toFixed(4));
      sticky.style.setProperty("--hero-scale", scale.toFixed(4));
      sticky.style.setProperty("--hero-opacity", opacity.toFixed(4));
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
