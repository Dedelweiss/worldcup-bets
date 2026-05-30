"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { BetStatus } from "@/types/database";

interface BetResultAnimationProps {
  status: BetStatus;
  children: React.ReactNode;
  className?: string;
}

export function BetResultAnimation({
  status,
  children,
  className,
}: BetResultAnimationProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (status !== "won" || fired.current) return;
    fired.current = true;

    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#4ade80", "#22c55e", "#86efac"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#4ade80", "#22c55e", "#86efac"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [status]);

  if (status === "won") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  if (status === "lost") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          x: [0, -6, 6, -4, 4, 0],
        }}
        transition={{ duration: 0.5 }}
        className={`grayscale ${className ?? ""}`}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={className}>{children}</div>;
}
