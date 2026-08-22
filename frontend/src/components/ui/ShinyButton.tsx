"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glow" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShinyButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ShinyButtonProps) {
  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs font-semibold gap-1.5",
    md: "px-5 py-2.5 text-sm font-semibold gap-2",
    lg: "px-7 py-3.5 text-base font-bold gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-slate-950 text-white hover:bg-slate-900 shadow-md shadow-slate-950/20 border border-slate-800",
    secondary:
      "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm",
    glow:
      "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-indigo-400/30",
    outline:
      "bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white",
  }[variant];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl overflow-hidden cursor-pointer select-none transition-colors duration-200",
        sizeStyles,
        variantStyles,
        className
      )}
      {...(props as any)}
    >
      {/* Moving highlight reflection */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
