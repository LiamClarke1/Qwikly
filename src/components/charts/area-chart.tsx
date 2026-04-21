"use client";

import { useMemo, useState } from "react";

export interface SeriesPoint {
  label: string;
  values: number[];
}

interface Props {
  data: SeriesPoint[];
  series: { name: string; color: string }[];
  height?: number;
}

export function AreaChart({ data, series, height = 240 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };

  const { vbW, vbH, paths, areas, ticks, points } = useMemo(() => {
    const vbW = 800;
    const vbH = height;
    const innerW = vbW - padding.left - padding.right;
    const innerH = vbH - padding.top - padding.bottom;
    const allValues = data.flatMap((d) => d.values);
    const max = Math.max(...allValues, 1);
    const min = 0;
    const range = max - min || 1;

    const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

    const points: number[][] = series.map(() => []);
    series.forEach((_, sIdx) => {
      data.forEach((d, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + innerH - ((d.values[sIdx] - min) / range) * innerH;
        points[sIdx].push(x, y);
      });
    });

    const paths = points.map((pts) => {
      let p = "";
      for (let i = 0; i < pts.length; i += 2) {
        p += i === 0 ? `M ${pts[i]} ${pts[i + 1]}` : ` L ${pts[i]} ${pts[i + 1]}`;
      }
      return p;
    });
    const areas = paths.map((p) => {
      const pts = p.split(/[ML] /).filter(Boolean);
      const last = pts[pts.length - 1];
      const lastX = last?.split(" ")[0];
      const firstX = pts[0]?.split(" ")[0];
      return `${p} L ${lastX} ${padding.top + innerH} L ${firstX} ${padding.top + innerH} Z`;
    });

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const v = (max / tickCount) * (tickCount - i);
      const y = padding.top + (innerH / tickCount) * i;
      return { v: Math.round(v), y };
    });

    return { vbW, vbH, paths, areas, ticks, points };
  }, [data, series, height]);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * vbW;
    const innerW = vbW - padding.left - padding.right;
    const idx = Math.round(((x - padding.left) / innerW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover(idx);
  };

  if (!data.length) return null;
  const innerW = vbW - padding.left - padding.right;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-full"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.40" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} x2={vbW - padding.right} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" />
            <text x={padding.left - 8} y={t.y + 4} fontSize="11" fill="#6B7280" textAnchor="end" className="num">
              {t.v}
            </text>
          </g>
        ))}

        {areas.map((a, i) => (
          <path key={i} d={a} fill={`url(#grad-${i})`} />
        ))}
        {paths.map((p, i) => (
          <path key={i} d={p} fill="none" stroke={series[i].color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {data.map((d, i) => (
          <text
            key={i}
            x={padding.left + i * stepX}
            y={vbH - 8}
            fontSize="11"
            fill="#6B7280"
            textAnchor="middle"
            className="num"
          >
            {i % Math.max(1, Math.floor(data.length / 7)) === 0 ? d.label : ""}
          </text>
        ))}

        {hover !== null && (
          <>
            <line
              x1={padding.left + hover * stepX}
              x2={padding.left + hover * stepX}
              y1={padding.top}
              y2={vbH - padding.bottom}
              stroke="rgba(255,255,255,0.20)"
              strokeDasharray="3 3"
            />
            {series.map((s, sIdx) => {
              const x = points[sIdx][hover * 2];
              const y = points[sIdx][hover * 2 + 1];
              return <circle key={sIdx} cx={x} cy={y} r={4} fill="#0E1116" stroke={s.color} strokeWidth={2} />;
            })}
          </>
        )}
      </svg>

      {hover !== null && (
        <div
          className="absolute top-2 -translate-x-1/2 panel-strong px-3 py-2 text-tiny pointer-events-none whitespace-nowrap"
          style={{ left: `${((padding.left + hover * stepX) / vbW) * 100}%` }}
        >
          <p className="text-fg-muted mb-1">{data[hover].label}</p>
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2 num">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-fg-muted">{s.name}</span>
              <span className="text-fg font-semibold">{data[hover].values[i]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
