interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  centered = true,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center flex flex-col items-center" : ""}>
      <div className="w-16 h-px bg-border mb-6" />
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted text-lg mt-4 max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}
