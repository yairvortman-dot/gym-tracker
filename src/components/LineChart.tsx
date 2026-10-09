import { useMemo, useRef, useState } from 'react';
import { fmtNum, fmtShortDate } from '../lib/format';

export interface Point {
  x: number; // timestamp
  y: number;
}

const W = 340;
const H = 150;
const PAD = { top: 16, right: 40, bottom: 22, left: 8 };

function niceTicks(min: number, max: number, count = 3): number[] {
  if (min === max) {
    const d = Math.max(1, Math.abs(min) * 0.1);
    min -= d;
    max += d;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/** One series, one axis. Tap or drag to inspect a point. Time runs left to right. */
export function LineChart({ points, unit, label }: { points: Point[]; unit: string; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geo = useMemo(() => {
    const ys = points.map((p) => p.y);
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const x0 = points[0]?.x ?? 0;
    const x1 = points[points.length - 1]?.x ?? 1;
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const sx = (x: number) => PAD.left + (x1 === x0 ? iw / 2 : ((x - x0) / (x1 - x0)) * iw);
    const sy = (y: number) => PAD.top + ih - ((y - y0) / (y1 - y0 || 1)) * ih;
    return { ticks, sx, sy };
  }, [points]);

  if (points.length === 0) return <p className="muted chart-empty">אין עדיין נתונים</p>;

  const { ticks, sx, sy } = geo;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const base = sy(ticks[0]);
  const area = `${path}L${sx(points[points.length - 1].x).toFixed(1)},${base}L${sx(points[0].x).toFixed(1)},${base}Z`;
  const lastP = points[points.length - 1];
  const shown = active ?? null;

  const pick = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(sx(p.x) - x) < Math.abs(sx(points[best].x) - x)) best = i;
    });
    setActive(best);
  };

  return (
    <figure className="chart" dir="ltr">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label}: ${points.map((p) => `${fmtShortDate(p.x)} ${fmtNum(p.y)}`).join(', ')}`}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => e.buttons && pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} />
            <text className="tick" x={W - PAD.right + 6} y={sy(t) + 4}>
              {fmtNum(t)}
            </text>
          </g>
        ))}
        <path className="area" d={area} />
        <path className="line" d={path} />
        {points.map((p, i) => (
          <circle key={i} className="dot" cx={sx(p.x)} cy={sy(p.y)} r={i === shown ? 6 : 4} />
        ))}
        <text className="tick" x={PAD.left} y={H - 6}>
          {fmtShortDate(points[0].x)}
        </text>
        {points.length > 1 && (
          <text className="tick" x={W - PAD.right} y={H - 6} textAnchor="end">
            {fmtShortDate(lastP.x)}
          </text>
        )}
        {shown == null && (
          <text className="end-label" x={sx(lastP.x)} y={sy(lastP.y) - 10} textAnchor={points.length > 1 ? 'end' : 'middle'}>
            {fmtNum(lastP.y)}
          </text>
        )}
        {shown != null && (
          <g>
            <line className="crosshair" x1={sx(points[shown].x)} x2={sx(points[shown].x)} y1={PAD.top} y2={base} />
          </g>
        )}
      </svg>
      {shown != null && (
        <figcaption className="chart-tip" dir="rtl">
          <bdi dir="ltr">{fmtShortDate(points[shown].x)}</bdi>: <strong className="num">{fmtNum(points[shown].y)}</strong> {unit}
        </figcaption>
      )}
    </figure>
  );
}
