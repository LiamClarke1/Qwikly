"use client";

import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger, .reveal-chain, .reveal-words"
      )
    );

    if (elements.length === 0) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const revealIfNearViewport = () => {
      const vh = window.innerHeight;
      for (const el of elements) {
        if (el.classList.contains("visible")) continue;
        const rect = el.getBoundingClientRect();
        // Reveal anything within 800px of entering the viewport (above or below).
        if (rect.top < vh + 800) {
          el.classList.add("visible");
        }
      }
    };

    // Immediate first pass: reveal everything already on-screen or near it.
    revealIfNearViewport();

    // Observer preloads elements 1200px before they enter the viewport so fast
    // scrolling never catches an element still at opacity:0.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: "1200px 0px 400px 0px",
      }
    );

    elements.forEach((el) => {
      if (!el.classList.contains("visible")) observer.observe(el);
    });

    // Hard failsafe: 700ms covers even heavy pages. Prevents any element from
    // being permanently invisible if the observer is delayed.
    const failsafe = window.setTimeout(() => {
      elements.forEach((el) => el.classList.add("visible"));
    }, 700);

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        revealIfNearViewport();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(failsafe);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);
}
