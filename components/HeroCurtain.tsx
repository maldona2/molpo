"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./HeroCurtain.module.css";

/**
 * Deja el hero fijo de fondo (cortina): al scrollear, el resto del sitio
 * sube por encima mientras el hero se aleja y atenúa suavemente (parallax).
 * El progreso 0→1 del primer viewport se expone como la CSS var --curtain.
 */
export default function HeroCurtain({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      el.style.setProperty("--curtain", p.toFixed(4));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={styles.curtain}>
      {children}
    </div>
  );
}
