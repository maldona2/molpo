"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Reveal.module.css";

type Variant = "up" | "left" | "right" | "scale";

type RevealProps = {
  children: ReactNode;
  /** HTML tag to render. Defaults to "div". */
  as?: "div" | "section" | "ol" | "ul" | "li" | "header" | "span";
  className?: string;
  /** Direction/style of the entrance. Ignored when `stagger` is set. */
  variant?: Variant;
  /** Delay before this element animates in, in milliseconds. */
  delay?: number;
  /** Animate direct children in sequence instead of the element itself. */
  stagger?: boolean;
  /** Extra element-specific props (e.g. aria-*, id). */
  [key: string]: unknown;
};

export default function Reveal({
  children,
  as = "div",
  className,
  variant = "up",
  delay = 0,
  stagger = false,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced-motion: reveal immediately, skip observing.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const base = stagger ? styles.stagger : `${styles.reveal} ${styles[variant]}`;
  const combined = [base, visible ? styles.visible : "", className].filter(Boolean).join(" ");

  return createElement(
    as,
    {
      ref,
      className: combined,
      style: delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined,
      ...rest,
    },
    children,
  );
}
