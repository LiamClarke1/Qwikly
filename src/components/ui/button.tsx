"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-ember text-paper hover:bg-ember-deep shadow-[0_4px_14px_-4px_rgba(232,90,44,0.4)]",
  secondary:
    "bg-surface-input text-fg border border-[var(--border-strong)] hover:bg-surface-active",
  ghost:
    "text-fg-muted hover:text-fg hover:bg-surface-hover",
  outline:
    "border border-[var(--border-strong)] text-fg hover:bg-surface-hover",
  danger:
    "bg-red-500/10 text-red-600 border border-red-500/25 hover:bg-red-500/20",
};

const sizes: Record<Size, string> = {
  sm:   "h-8 px-3 text-small rounded-lg gap-1.5",
  md:   "h-10 px-4 text-body rounded-xl gap-2",
  lg:   "h-12 px-5 text-body rounded-xl gap-2",
  icon: "h-9 w-9 rounded-lg justify-center",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
