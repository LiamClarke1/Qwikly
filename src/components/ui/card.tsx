import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  glow?: boolean;
}

export function Card({ className, padded = true, glow, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] bg-surface-card border border-[var(--border)] shadow-[var(--shadow-sm)]",
        padded && "p-5",
        glow && "shadow-glow",
        className
      )}
      {...rest}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="min-w-0">
        <h2 className="text-h2 text-fg">{title}</h2>
        {description && <p className="text-small text-fg-muted mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
