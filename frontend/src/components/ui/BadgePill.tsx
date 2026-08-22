"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BadgePillProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "indigo" | "emerald" | "amber" | "neutral" | "gradient";
  className?: string;
  pulse?: boolean;
}

export function BadgePill({
  children,
  icon,
  variant = "indigo",
  className,
  pulse = true,
}: BadgePillProps) {
  const variantStyles = {
    indigo: "bg-indigo-50/80 border-indigo-200/80 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300",
    emerald: "bg-emerald-50/80 border-emerald-200/80 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
    amber: "bg-amber-50/80 border-amber-200/80 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
    neutral: "bg-slate-100/90 border-slate-200 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200",
    gradient: "bg-indigo-50/90 border-indigo-200/80 text-indigo-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 shadow-xs",
  }[variant];

  const dotColors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    neutral: "bg-slate-500",
    gradient: "bg-indigo-600",
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all shadow-xs",
        variantStyles,
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColors)} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColors)} />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.div>
  );
}
