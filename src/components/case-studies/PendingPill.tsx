/**
 * Small inline pill rendered next to any field that still contains "TODO".
 * Visual signal so we never quietly ship a half-finished case study to
 * the public site.
 */
export function PendingPill() {
  return (
    <span
      role="status"
      aria-label="Pending publish, this field has not been filled in yet"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink/[0.06] border border-ink/10 align-middle ml-2"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />
      <span
        className="font-mono text-[10px] text-ink-500"
        style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        Pending publish
      </span>
    </span>
  );
}

/**
 * Renders a value, but if the value is a TODO placeholder, swap it for a
 * subtle "Pending publish" pill so the page never literally shows "TODO".
 */
export function FieldOrPending({
  value,
  fallback = "—",
  className,
}: {
  value: string;
  fallback?: string;
  className?: string;
}) {
  if (typeof value === "string" && value.includes("TODO")) {
    return (
      <span className={className}>
        <span className="text-ink-400">{fallback}</span>
        <PendingPill />
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}
