"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

type Props = {
  children: ReactNode;
  className?: string;
  href?: string;
  strength?: number;
  onClick?: () => void;
  "aria-label"?: string;
};

/**
 * Wraps a CTA so it drifts toward the cursor (magnetic pull) and springs back on leave.
 * Renders an anchor when `href` is provided, otherwise a button.
 */
export default function MagneticButton({
  children,
  className,
  href,
  strength = 0.4,
  onClick,
  ...rest
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 250, damping: 18, mass: 0.4 });

  function handleMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  const MotionTag = (href ? motion.a : motion.button) as typeof motion.button;

  return (
    <MotionTag
      // @ts-expect-error ref target differs between a/button but is fine at runtime
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.96 }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
