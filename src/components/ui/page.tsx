export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        {eyebrow && (
          <p className="text-small text-brand font-medium mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-display-2 text-fg text-balance">{title}</h1>
        {description && (
          <p className="text-body text-fg-muted mt-1.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
