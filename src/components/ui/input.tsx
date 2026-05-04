"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const baseInput =
  "w-full bg-surface-input border border-[var(--border)] rounded-xl px-4 py-2.5 text-body text-fg placeholder:text-fg-faint outline-none focus:border-ember/40 focus:ring-2 focus:ring-ember/10 transition-colors duration-150 hover:border-[var(--border-strong)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(baseInput, className)} {...rest} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(baseInput, "resize-y min-h-[100px] leading-relaxed", className)}
        {...rest}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(baseInput, "cursor-pointer appearance-none pr-10", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236A6A63' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  }
);

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-small font-medium text-fg mb-1.5">{children}</span>
      {hint && <span className="block text-small text-fg-muted mb-1.5 -mt-1">{hint}</span>}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {children}
      {error && <p className="text-tiny text-danger mt-1.5">{error}</p>}
    </div>
  );
}
