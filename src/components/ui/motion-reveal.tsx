"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
