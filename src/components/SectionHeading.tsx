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
      <div className="w-12 h-1 bg-cta rounded-full mb-4" />
      <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted text-lg mt-4 max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}
