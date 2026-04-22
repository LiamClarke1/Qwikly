import Link from "next/link";
import { ArrowRight } from "lucide-react";

const DEFAULT_HREF = "/signup";

interface CTAButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "solid" | "outline" | "outline-light";
  size?: "sm" | "md" | "lg";
  className?: string;
  withArrow?: boolean;
}

const sizeClasses: Record<NonNullable<CTAButtonProps["size"]>, string> = {
  sm: "px-4 py-2 text-[0.85rem]",
  md: "px-6 py-3 text-[0.95rem]",
  lg: "px-8 py-[1.05rem] text-[1rem]",
};

export default function CTAButton({
  children,
  href = DEFAULT_HREF,
  variant = "primary",
  size = "md",
  className = "",
  withArrow = true,
}: CTAButtonProps) {
  const base =
    variant === "outline"
      ? "btn-ghost"
      : variant === "outline-light"
      ? "btn-ghost btn-ghost-light"
      : variant === "solid"
      ? "btn-ember btn-ember-solid"
      : "btn-ember";

  const classes = `${base} ${sizeClasses[size]} ${className}`.trim();
  const isExternal = href.startsWith("http");

  const inner = (
    <>
      <span className="relative z-10">{children}</span>
      {withArrow && (
        <ArrowRight className="btn-arrow w-4 h-4 relative z-10" strokeWidth={2.25} />
      )}
    </>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
