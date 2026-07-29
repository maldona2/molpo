"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

type Props = {
  /** Heading text. Use "\n" to force a line break. */
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
  /** Extra delay before the reveal starts, in seconds. */
  delay?: number;
};

const container: Variants = {
  hidden: {},
  visible: (delay: number = 0) => ({
    transition: { staggerChildren: 0.055, delayChildren: delay },
  }),
};

const word: Variants = {
  hidden: { y: "115%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 150, damping: 24, mass: 0.85 },
  },
};

export default function AnimatedHeading({ text, as = "h2", className, id, delay = 0 }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return createHeading(as, { id, className }, text);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionTag = (motion as any)[as];
  const lines = text.split("\n");

  return (
    <MotionTag
      id={id}
      className={className}
      aria-label={text}
      variants={container}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      style={{ display: "block" }}
    >
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" style={{ display: "block" }}>
          {line.split(" ").map((w, wi) => (
            <span
              key={wi}
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "top",
                paddingBottom: "0.12em",
                marginBottom: "-0.12em",
                marginRight: "0.26em",
              }}
            >
              <motion.span variants={word} style={{ display: "inline-block", willChange: "transform" }}>
                {w}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </MotionTag>
  );
}

function createHeading(
  as: "h1" | "h2" | "h3",
  props: { id?: string; className?: string },
  text: string,
) {
  const Tag = as;
  return (
    <Tag id={props.id} className={props.className}>
      {text.split("\n").map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 ? <br /> : null}
        </span>
      ))}
    </Tag>
  );
}
