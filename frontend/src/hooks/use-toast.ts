"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

let toastCount = 0;

const toastListeners: Array<(toasts: ToasterToast[]) => void> = [];
let memoryToasts: ToasterToast[] = [];

function dispatch(toasts: ToasterToast[]) {
  memoryToasts = toasts;
  toastListeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = String(++toastCount);
  dispatch([...memoryToasts, { id, ...props }].slice(-TOAST_LIMIT));
  setTimeout(() => {
    dispatch(memoryToasts.filter((t) => t.id !== id));
  }, TOAST_REMOVE_DELAY);
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToasterToast[]>(memoryToasts);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      const idx = toastListeners.indexOf(setToasts);
      if (idx > -1) toastListeners.splice(idx, 1);
    };
  }, []);

  return { toasts, toast };
}
