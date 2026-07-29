"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./Servicios.module.css";

const MotionLink = motion.create(Link);

type Servicio = { num: string; slug: string; titulo: string; texto: string };

export default function ServicioCard({ s, index }: { s: Servicio; index: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);

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
      href={`/servicios/${s.slug}/`}
      className={styles.card}
      onPointerMove={handleMove}
      initial={reduce ? false : { opacity: 0, y: 44, filter: "blur(8px)" }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.75, delay: index * 0.09 }}
      whileHover={reduce ? undefined : { y: -6 }}
    >
      <span className={styles.spotlight} aria-hidden="true" />
      <div className={styles.num} aria-hidden="true">
        {s.num}
      </div>
      <h3 className={styles.cardTitle}>{s.titulo}</h3>
      <p className={styles.cardText}>{s.texto}</p>
      <span className={styles.cardLink}>Ver servicio →</span>
    </MotionLink>
  );
}
