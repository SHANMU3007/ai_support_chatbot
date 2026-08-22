"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  className?: string;
  pattern?: "dots" | "grid" | "none";
  showOrbs?: boolean;
}

export function AnimatedBackground({
  className,
  pattern = "dots",
  showOrbs = true,
}: AnimatedBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Pattern Overlay with radial fade */}
      {pattern === "dots" && (
        <div className="absolute inset-0 bg-dot-pattern opacity-60 [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_80%)]" />
      )}
      {pattern === "grid" && (
        <div className="absolute inset-0 bg-grid-pattern opacity-70 [mask-image:radial-gradient(ellipse_at_center,white_40%,transparent_85%)]" />
      )}

      {/* Floating Aurora Glow Orbs */}
      {showOrbs && (
        <>
          <motion.div
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -50, 20, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-500/10 via-slate-400/5 to-transparent blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -30, 30, 0],
              y: [0, 40, -30, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -30, 40, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-gradient-to-tr from-slate-400/10 via-indigo-400/5 to-transparent blur-3xl"
          />
        </>
      )}
    </div>
  );
}
