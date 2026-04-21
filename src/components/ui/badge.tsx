import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "violet" | "sky" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-fg-muted border border-line",
  brand: "bg-brand-soft text-brand border border-brand/20",
  violet: "bg-violet-soft text-violet border border-violet/20",
  sky: "bg-sky-soft text-sky border border-sky/20",
  success: "bg-success-soft text-success border border-success/20",
  danger: "bg-danger-soft text-danger border border-danger/20",
  warning: "bg-warning-soft text-warning border border-warning/20",
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
