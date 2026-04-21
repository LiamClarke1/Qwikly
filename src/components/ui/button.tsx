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
    "bg-grad-brand text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.5)] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white/[0.06] text-fg border border-line-strong hover:bg-white/[0.10]",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.04]",
  outline:
    "border border-line-strong text-fg hover:bg-white/[0.04]",
  danger:
    "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small rounded-lg gap-1.5",
  md: "h-10 px-4 text-body rounded-xl gap-2",
  lg: "h-12 px-5 text-body rounded-xl gap-2",
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
        "inline-flex items-center justify-center font-medium cursor-pointer transition-all duration-150 ring-focus disabled:opacity-50 disabled:cursor-not-allowed select-none",
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
