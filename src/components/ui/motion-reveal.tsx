"use client";

import { motion, useReducedMotion } from "framer-motion";

interface MotionRevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function MotionReveal({
  children,
  index = 0,
  className,
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion();

  // Reduced motion: render a static fade only, no spatial movement.
  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 };
  const animate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const transition = reduceMotion
    ? { duration: 0.2, delay: index * 0.03 }
    : {
        type: "spring" as const,
        stiffness: 260,
        damping: 30,
        delay: index * 0.05,
      };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
