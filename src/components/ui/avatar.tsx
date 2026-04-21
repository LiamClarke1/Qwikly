import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const palette = [
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-600",
  "from-sky-500 to-indigo-600",
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

function pick(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const label = (initials(name) || "??").toUpperCase();
  const grad = pick(name || label);
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center shrink-0 ring-1 ring-white/10",
        grad,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {label}
    </div>
  );
}
