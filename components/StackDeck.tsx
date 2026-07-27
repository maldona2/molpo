"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";
import styles from "./StackDeck.module.css";

/**
 * Convierte cada hijo directo en una "pantalla" del deck: cards con el mismo
 * marco redondeado del hero que se apilan al scrollear. Cada card queda
 * pegada (sticky) mientras la siguiente la cubre; la cubierta retrocede con
 * una leve escala (--cover) y el contenido de cada card entra con reveal.
 */
export default function StackDeck({ children }: { children: ReactNode }) {
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const cards = Array.from(deck.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal: marca cada card cuando entra al viewport (una sola vez)
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    cards.forEach((card) => io.observe(card));

    if (reduce) return () => io.disconnect();

    let raf = 0;

    // Cards más altas que el viewport: sticky top negativo para que se lean
    // enteras antes de quedar pegadas y ser cubiertas.
    const layout = () => {
      const vh = window.innerHeight;
      for (const card of cards) {
        card.style.top = `${Math.min(0, vh - card.offsetHeight)}px`;
      }
    };

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (let i = 0; i < cards.length - 1; i++) {
        const next = cards[i + 1].getBoundingClientRect();
        // 0 = la siguiente card todavía abajo · 1 = cubre por completo
        const cover = Math.min(1, Math.max(0, 1 - next.top / vh));
        cards[i].style.setProperty("--cover", cover.toFixed(4));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      layout();
      onScroll();
    };

    layout();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={deckRef} className={styles.deck}>
      {Children.map(children, (child) =>
        child == null ? null : (
          <div className={styles.card}>
            <div className={styles.revealer}>{child}</div>
          </div>
        ),
      )}
    </div>
  );
}
