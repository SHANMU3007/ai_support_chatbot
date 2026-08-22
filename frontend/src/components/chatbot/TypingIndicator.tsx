"use client";

import { Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  primaryColor: string;
}

export function TypingIndicator({ primaryColor }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2.5 justify-start"
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm border border-white/20"
        style={{ backgroundColor: primaryColor || "#4f46e5" }}
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -5, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: primaryColor || "#4f46e5" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
