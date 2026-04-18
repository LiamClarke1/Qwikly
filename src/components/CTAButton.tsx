import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TALLY_URL = "https://tally.so/r/YOUR_FORM_ID";

interface CTAButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function CTAButton({
  children,
  href = TALLY_URL,
  variant = "primary",
  size = "md",
  className = "",
}: CTAButtonProps) {
  const baseClasses =
    "inline-flex items-center gap-2 font-semibold rounded-lg cursor-pointer transition-colors duration-200";

  const variantClasses =
    variant === "primary"
      ? "bg-cta hover:bg-cta-hover text-white"
      : "border-2 border-cta text-cta hover:bg-cta hover:text-white";

  const classes = `${baseClasses} ${variantClasses} ${sizeClasses[size]} ${className}`;

  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        {variant === "primary" && <ArrowRight className="w-4 h-4" />}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      {variant === "primary" && <ArrowRight className="w-4 h-4" />}
    </Link>
  );
}
