"use client";

import { useEffect } from "react";

/**
 * IntersectionObserver that adds `visible` when elements enter view.
 * Covers all reveal variants used in the editorial system.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(
      ".reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger, .reveal-words"
    );

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
