"use client";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = "#3B82F6",
  fill = "rgba(59,130,246,0.18)",
  className,
}: Props) {
  if (!data.length) return <svg width={width} height={height} className={className} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
