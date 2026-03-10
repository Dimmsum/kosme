"use client";

import { motion, Variants, Transition } from "framer-motion";
import { ReactNode } from "react";

type Direction = "up" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}

const variants: Record<Direction, Variants> = {
  up:    { hidden: { opacity: 0, y: 40 },  visible: { opacity: 1, y: 0 }  },
  left:  { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 }  },
  right: { hidden: { opacity: 0, x: 40 },  visible: { opacity: 1, x: 0 }  },
  none:  { hidden: { opacity: 0 },          visible: { opacity: 1 }         },
};

const transition: Transition = {
  duration: 0.75,
  ease: [0.22, 1, 0.36, 1],
};

export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={variants[direction]}
      transition={{ ...transition, delay }}
    >
      {children}
    </motion.div>
  );
}
