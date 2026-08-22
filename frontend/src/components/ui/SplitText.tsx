"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity: number; y?: number; x?: number; scale?: number };
  animationTo?: { opacity: number; y?: number; x?: number; scale?: number };
  threshold?: number;
  rootMargin?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  onLetterAnimationComplete?: () => void;
}

export function SplitText({
  text = "",
  className = "",
  delay = 35,
  animationFrom = { opacity: 0, y: 30 },
  animationTo = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, amount: threshold, margin: rootMargin as any });

  // Split into words, then words into characters so words wrap properly on responsive screens
  const words = text.split(" ");

  let totalLettersCount = 0;
  words.forEach((w) => {
    totalLettersCount += w.length;
  });

  const completedCountRef = useRef(0);

  const handleAnimationComplete = () => {
    completedCountRef.current += 1;
    if (completedCountRef.current === totalLettersCount && onLetterAnimationComplete) {
      onLetterAnimationComplete();
    }
  };

  let globalCharIndex = 0;

  return (
    <p
      ref={ref}
      className={cn(
        "inline-flex flex-wrap overflow-hidden",
        textAlign === "center" && "justify-center text-center",
        textAlign === "left" && "justify-start text-left",
        textAlign === "right" && "justify-end text-right",
        className
      )}
    >
      {words.map((word, wordIndex) => {
        const letters = word.split("");
        return (
          <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em]">
            {letters.map((char, charIndex) => {
              const charDelay = (globalCharIndex * delay) / 1000;
              globalCharIndex++;

              return (
                <motion.span
                  key={charIndex}
                  initial={animationFrom}
                  animate={inView ? animationTo : animationFrom}
                  transition={{
                    duration: 0.5,
                    delay: charDelay,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  onAnimationComplete={handleAnimationComplete}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </p>
  );
}
