import { useState } from 'react';

export interface TrendPoint {
  at: number;
  value: number;
}

interface Props {
  /** En orden cronológico (más antiguo primero). */
  points: TrendPoint[];
  /** true si un valor menor es mejor (tiempos): el eje se invierte para que mejorar sea subir. */
  lowerIsBetter: boolean;
  format: (v: number) => string;
  formatDate: (at: number) => string;
  label: string;
}

const W = 320;
const H = 150;
const PAD = { top: 14, right: 14, bottom: 22, left: 44 };

/**
 * Línea de resultados de una actividad (una sola serie: sin leyenda). Más
 * arriba = mejor. Al tocar un punto se muestra su valor y fecha.
 */
export default function TrendChart({
  points,
  lowerIsBetter,
  format,
  formatDate,
  label,
}: Props) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0) return null;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  // Mejor arriba: con tiempos el mínimo va arriba.
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    return PAD.top + (lowerIsBetter ? t : 1 - t) * ih;
  };
  const best = lowerIsBetter ? min : max;
  const worst = lowerIsBetter ? max : min;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const s = sel ?? points.length - 1;

  return (
    <figure className="flex flex-col gap-1">
      <p className="min-h-[1.25rem] text-center text-sm" aria-live="polite">
        <span className="font-semibold">{format(points[s].value)}</span>
        <span className="text-app-muted"> · {formatDate(points[s].at)}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        {/* Rejilla: mejor y peor resultado */}
        {[best, worst].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgb(var(--c-border))"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(v)}
              dy="0.35em"
              textAnchor="end"
              fontSize={11}
              fill="rgb(var(--c-muted))"
            >
              {format(v)}
            </text>
          </g>
        ))}
        <path
          d={path}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i} onClick={() => setSel(i)} className="cursor-pointer">
            {/* Área de toque más grande que el punto */}
            <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === s ? 6 : 4}
              fill="#6366f1"
              stroke="rgb(var(--c-surface))"
              strokeWidth={2}
            />
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={11} fill="rgb(var(--c-muted))">
          {formatDate(points[0].at)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          fontSize={11}
          fill="rgb(var(--c-muted))"
        >
          {formatDate(points[points.length - 1].at)}
        </text>
      </svg>
    </figure>
  );
}
