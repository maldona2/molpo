"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Proyecto } from "@/content/portfolio";
import styles from "./Casos.module.css";

const MotionLink = motion.create(Link);

export default function CasoCard({ p, index }: { p: Proyecto; index: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const dark = p.card.variant === "dark";

  function handleMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <MotionLink
      ref={ref}
      href={`/casos/${p.slug}/`}
      className={`${styles.card} ${dark ? styles.dark : styles.light}`}
      onPointerMove={handleMove}
      initial={reduce ? false : { opacity: 0, y: 44, filter: "blur(8px)" }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.75, delay: index * 0.09 }}
      whileHover={reduce ? undefined : { y: -6 }}
    >
      <div
        className={`${styles.watermark} ${dark ? styles.wmDark : styles.wmLight}`}
        aria-hidden="true"
      />
      <span className={`${styles.spotlight} ${dark ? styles.spotDark : styles.spotLight}`} aria-hidden="true" />
      <div className={styles.cliente}>{p.cliente}</div>
      <h3 className={styles.cardTitle}>{p.card.titulo}</h3>
      <p className={styles.cardText}>{p.card.texto}</p>
      <div className={styles.tags}>
        {p.card.tags.map((t) => (
          <span key={t} className={styles.tag}>
            {t}
          </span>
        ))}
      </div>
      <span className={styles.verCaso}>Ver caso completo →</span>
    </MotionLink>
  );
}
