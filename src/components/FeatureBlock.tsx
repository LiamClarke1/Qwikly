interface FeatureBlockProps {
  badge: string;
  badgeColor?: string;
  title: string;
  description: string;
  reversed?: boolean;
  visual: React.ReactNode;
}

export default function FeatureBlock({
  badge,
  badgeColor = "bg-accent/10 text-accent",
  title,
  description,
  reversed = false,
  visual,
}: FeatureBlockProps) {
  return (
    <div
      className={`feature-block-hover flex flex-col gap-8 lg:gap-16 items-center rounded-xl p-4 lg:p-6 ${
        reversed ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      {/* Text side */}
      <div className="flex-1 w-full lg:w-auto">
        <span
          className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
        <h3 className="font-sans text-2xl md:text-3xl font-bold text-text-dark mt-4">
          {title}
        </h3>
        <p className="text-text-muted-dark text-base md:text-lg leading-relaxed mt-4 max-w-lg">
          {description}
        </p>
      </div>

      {/* Visual side */}
      <div className="flex-1 w-full lg:w-auto flex justify-center">
        {visual}
      </div>
    </div>
  );
}
