"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

export function useReveal(options?: { once?: boolean; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: (options?.margin ?? "-60px") as `${number}px`,
  });

  return { ref, isInView };
}
