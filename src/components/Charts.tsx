import React, { useMemo } from 'react';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  /** Sudut celah antar potongan (derajat). */
  gap?: number;
}

/**
 * Donut chart berbasis SVG arc. Tidak memakai library eksternal agar
 * ukuran bundle tetap kecil dan warnanya bisa mengikuti tema.
 */
export function DonutChart({
  slices,
  size = 190,
  thickness = 26,
  centerValue,
  centerLabel,
  gap = 3,
}: DonutProps) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let angle = -90; // mulai dari atas
    return slices
      .filter((s) => s.value > 0)
      .map((s) => {
        const sweep = (s.value / total) * 360;
        const start = angle + gap / 2;
        const end = angle + sweep - gap / 2;
        angle += sweep;
        return { ...s, path: describeArc(cx, cy, radius, start, Math.max(start + 0.6, end)) };
      });
  }, [slices, total, cx, cy, radius, gap]);

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label="Diagram lingkaran">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={thickness}
        />
        {arcs.map((a, i) => (
          <path
            key={`${a.label}-${i}`}
            d={a.path}
            fill="none"
            stroke={a.color}
            strokeWidth={thickness}
            strokeLinecap="round"
          >
            <title>{`${a.label}: ${a.value}`}</title>
          </path>
        ))}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="donut-center">
          {centerValue && <div className="val mono">{centerValue}</div>}
          {centerLabel && <div className="lbl">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  // SVG arc tidak bisa menggambar lingkaran penuh; pecah menjadi dua busur.
  if (sweep >= 359.4) {
    const half = describeArc(cx, cy, r, startDeg, startDeg + 180);
    const rest = describeArc(cx, cy, r, startDeg + 180, startDeg + 359.9);
    return `${half} ${rest}`;
  }
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export interface BarDatum {
  label: string;
  /** Nilai batang, urut sesuai `colors`. */
  values: number[];
}

interface BarChartProps {
  data: BarDatum[];
  colors: string[];
  height?: number;
  /** Format nilai untuk tooltip judul. */
  formatValue?: (v: number) => string;
}

/** Grouped bar chart sederhana berbasis div, ringan dan mudah dianimasikan. */
export function BarChart({ data, colors, height = 150, formatValue }: BarChartProps) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-group" key={`${d.label}-${i}`}>
          <div className="bar-stack">
            {d.values.map((v, j) => (
              <div
                key={j}
                className="bar"
                style={{
                  height: `${Math.max(3, (v / max) * 100)}%`,
                  background: colors[j % colors.length],
                  opacity: v === 0 ? 0.25 : 1,
                }}
                title={`${d.label}: ${formatValue ? formatValue(v) : v}`}
              />
            ))}
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

interface ProgressProps {
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color = 'var(--green-500)', height = 8 }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" style={{ height }} role="progressbar" aria-valuenow={Math.round(clamped)}>
      <div style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

interface RingProps {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: React.ReactNode;
}

/** Ring progress kecil untuk kartu anggaran. */
export function ProgressRing({ value, size = 96, thickness = 10, color = 'var(--green-500)', label }: RingProps) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {label && <div className="donut-center">{label}</div>}
    </div>
  );
}
