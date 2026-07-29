"use client";

import { Children, createElement, isValidElement, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

type Variant = "up" | "left" | "right" | "scale" | "blur";
type Tag = "div" | "section" | "ol" | "ul" | "li" | "header" | "span";

type RevealProps = {
  children: ReactNode;
  /** HTML tag to render. Defaults to "div". */
  as?: Tag;
  className?: string;
  /** Direction/style of the entrance. Ignored when `stagger` is set. */
  variant?: Variant;
  /** Delay before this element animates in, in milliseconds. */
  delay?: number;
  /** Animate direct children in sequence instead of the element itself. */
  stagger?: boolean;
  [key: string]: unknown;
};

const SPRING = { type: "spring", stiffness: 130, damping: 20, mass: 0.75 } as const;

const hidden: Record<Variant, Record<string, number | string>> = {
  up: { opacity: 0, y: 44, filter: "blur(8px)" },
  left: { opacity: 0, x: -64, filter: "blur(8px)" },
  right: { opacity: 0, x: 64, filter: "blur(8px)" },
  scale: { opacity: 0, scale: 0.94, filter: "blur(8px)" },
  blur: { opacity: 0, y: 22, filter: "blur(16px)" },
};
const shown = { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" };

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.04 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 36, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING },
};

// Cache motion-wrapped versions of custom components (e.g. next/link) so we
// don't recreate them on every render.
const motionCache = new Map<unknown, unknown>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMotion(type: any): any {
  if (typeof type === "string") return (motion as any)[type] ?? motion.div;
  if (!motionCache.has(type)) motionCache.set(type, motion.create(type));
  return motionCache.get(type);
}

export default function Reveal({
  children,
  as = "div",
  className,
  variant = "up",
  delay = 0,
  stagger = false,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return createElement(as, { className, ...rest }, children);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionTag = (motion as any)[as] ?? motion.div;
  const viewport = { once: true, amount: 0.2 } as const;

  if (stagger) {
    const swapped = Children.map(children, (child) => {
      if (!isValidElement(child)) return child;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const M = toMotion((child as any).type);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createElement(M, { ...(child as any).props, variants: itemVariants });
    });

    return (
      <MotionTag
        className={className}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        {...rest}
      >
        {swapped}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={hidden[variant]}
      whileInView={shown}
      viewport={viewport}
      transition={{ ...SPRING, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
