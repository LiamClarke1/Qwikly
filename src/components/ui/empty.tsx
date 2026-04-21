import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-line flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-fg-muted" />
        </div>
      )}
      <p className="text-body font-semibold text-fg">{title}</p>
      {description && (
        <p className="text-small text-fg-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white/[0.04] animate-pulse-soft",
        className
      )}
    />
  );
}
