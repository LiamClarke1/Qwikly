interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  centered?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  eyebrow,
  centered = true,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center flex flex-col items-center" : ""}>
      {eyebrow && <p className="eyebrow text-ink-500 mb-5">{eyebrow}</p>}
      <h2 className="display-lg text-ink">{title}</h2>
      {subtitle && (
        <p className="text-ink-700 text-lg mt-5 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
