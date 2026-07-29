"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./Marquee.module.css";

type Props = {
  children: ReactNode;
  /** seconds for one full loop */
  duration?: number;
  reverse?: boolean;
  className?: string;
};

/**
 * Seamless, infinitely scrolling marquee. Duplicates its children and translates
 * by exactly -50% so the loop is invisible. Pauses on hover, static if reduced motion.
 */
export default function Marquee({ children, duration = 28, reverse = false, className }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={`${styles.viewport} ${className ?? ""}`}>
        <div className={styles.staticRow}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.viewport} ${className ?? ""}`}>
      <motion.div
        className={styles.track}
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        <div className={styles.group} aria-hidden={false}>
          {children}
        </div>
        <div className={styles.group} aria-hidden={true}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
