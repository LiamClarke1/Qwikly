"use client";

interface Props {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showLabels?: boolean;
}

export function BarChart({ data, height = 200, color = "#F59E0B", showLabels = true }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const vbW = 800;
  const vbH = height;
  const padding = { top: 12, right: 8, bottom: 28, left: 8 };
  const innerW = vbW - padding.left - padding.right;
  const innerH = vbH - padding.top - padding.bottom;
  const barW = (innerW / data.length) * 0.62;
  const gap = (innerW / data.length) * 0.38;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padding.left + i * (barW + gap) + gap / 2;
        const y = padding.top + innerH - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={padding.top}
              width={barW}
              height={innerH}
              fill="rgba(255,255,255,0.025)"
              rx={4}
            />
            <rect x={x} y={y} width={barW} height={h} fill="url(#bar-grad)" rx={4} />
            {showLabels && i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
              <text
                x={x + barW / 2}
                y={vbH - 8}
                fontSize="11"
                fill="#6B7280"
                textAnchor="middle"
                className="num"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
