"use client";

import { useEffect } from "react";

/**
 * Scroll reveal hook tuned for fast scrolling.
 *
 * The original version used `threshold: 0.12` + a negative bottom rootMargin,
 * which meant that during a very fast scroll the IntersectionObserver callback
 * would be batched until after the element had already exited. Users would see
 * sections stuck at `opacity: 0` (cream emptiness) because `.visible` never
 * got applied.
 *
 * This version:
 * 1. Uses a large positive rootMargin so reveals trigger well before elements
 *    enter the viewport.
 * 2. Uses threshold 0 so any intersection fires immediately.
 * 3. On mount, force-reveals anything already near or past the viewport.
 * 4. After a short failsafe, reveals anything still pending — guarantees that
 *    a user can never end up looking at a permanently-invisible section.
 * 5. Respects prefers-reduced-motion by revealing everything instantly.
 */
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

    const revealIfPastTop = () => {
      const vh = window.innerHeight;
      for (const el of elements) {
        if (el.classList.contains("visible")) continue;
        const rect = el.getBoundingClientRect();
        // Already above or within viewport (with generous 200px buffer) → reveal now.
        if (rect.top < vh + 200) {
          el.classList.add("visible");
        }
      }
    };

    // First pass before the observer connects: anything on-screen or above is revealed immediately.
    revealIfPastTop();

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
        // Trigger well before element enters the viewport. Fast scrolls still hit this.
        rootMargin: "400px 0px 400px 0px",
      }
    );

    elements.forEach((el) => {
      if (!el.classList.contains("visible")) observer.observe(el);
    });

    // Hard failsafe: after 1.4s (enough for the eased transitions to feel intentional),
    // reveal anything still stuck. Prevents permanent empty sections from ever being
    // possible even if the observer is delayed by the main thread.
    const failsafe = window.setTimeout(() => {
      elements.forEach((el) => el.classList.add("visible"));
    }, 1400);

    // Extra safety on fast scroll: on each scroll event we ensure anything that has
    // already scrolled past the top of the page becomes visible. Passive listener, cheap.
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        revealIfPastTop();
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
