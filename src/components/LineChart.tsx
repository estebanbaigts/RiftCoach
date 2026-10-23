import { useMemo, useState } from "react";

export interface ChartPoint {
  x: number;
  y: number | null;
  label: string;
}

interface Props {
  points: readonly ChartPoint[];
  /** Accessible summary; the chart itself is decorative for screen readers. */
  summary: string;
  format: (y: number) => string;
  reference?: number | undefined;
  height?: number;
}

/** Dependency-free SVG line chart with keyboard + pointer inspection. */
export function LineChart({ points, summary, format, reference, height = 180 }: Props) {
  const width = 560;
  const pad = { l: 40, r: 12, t: 12, b: 22 };
  const valid = useMemo(() => points.filter((p): p is ChartPoint & { y: number } => p.y !== null), [points]);
  const [active, setActive] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (valid.length < 2) return null;
    const ys = valid.map((p) => p.y).concat(reference ?? []);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (max - min < 1e-9) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * 0.1;
    max += span * 0.1;
    const x0 = valid[0]!.x;
    const x1 = valid[valid.length - 1]!.x;
    const sx = (x: number) => pad.l + ((x - x0) / Math.max(1, x1 - x0)) * (width - pad.l - pad.r);
    const sy = (y: number) => pad.t + (1 - (y - min) / (max - min)) * (height - pad.t - pad.b);
    const ticks = [min + (max - min) * 0.15, min + (max - min) * 0.5, min + (max - min) * 0.85];
    const d = valid.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
    return { sx, sy, ticks, d };
  }, [valid, reference, height]);

  if (!geom) return <p className="muted">{summary}</p>;
  const a = active !== null ? valid[active] : undefined;

  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((i) => Math.min(valid.length - 1, (i ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? valid.length) - 1));
          else if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          let best = 0;
          valid.forEach((p, i) => {
            if (Math.abs(geom.sx(p.x) - x) < Math.abs(geom.sx(valid[best]!.x) - x)) best = i;
          });
          setActive(best);
        }}
      >
        {geom.ticks.map((tk) => (
          <g key={tk}>
            <line className="grid-line" x1={pad.l} x2={width - pad.r} y1={geom.sy(tk)} y2={geom.sy(tk)} />
            <text className="axis-label" x={pad.l - 6} y={geom.sy(tk) + 4} textAnchor="end">
              {format(tk)}
            </text>
          </g>
        ))}
        {reference !== undefined && <line className="ref-line" x1={pad.l} x2={width - pad.r} y1={geom.sy(reference)} y2={geom.sy(reference)} />}
        <path className="series" d={geom.d} />
        <text className="axis-label" x={pad.l} y={height - 4}>
          {valid[0]!.label}
        </text>
        <text className="axis-label" x={width - pad.r} y={height - 4} textAnchor="end">
          {valid[valid.length - 1]!.label}
        </text>
        {a && (
          <g>
            <line className="grid-line" x1={geom.sx(a.x)} x2={geom.sx(a.x)} y1={pad.t} y2={height - pad.b} />
            <circle className="hover-dot" cx={geom.sx(a.x)} cy={geom.sy(a.y)} r={4} />
            <text className="axis-label" x={Math.min(width - pad.r - 4, Math.max(pad.l + 4, geom.sx(a.x)))} y={pad.t + 2} textAnchor="middle" style={{ fill: "var(--text)" }}>
              {a.label} · {format(a.y)}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}
