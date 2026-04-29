import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "violet" | "sky" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-input text-fg-muted border border-[var(--border-strong)]",
  brand:   "bg-ember/10 text-ember border border-ember/20",
  violet:  "bg-violet-500/10 text-violet-600 border border-violet-500/20",
  sky:     "bg-sky-500/10 text-sky-600 border border-sky-500/20",
  success: "bg-green-500/10 text-green-700 border border-green-500/20",
  danger:  "bg-red-500/10 text-red-600 border border-red-500/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
};

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-tiny font-semibold",
        tones[tone],
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
