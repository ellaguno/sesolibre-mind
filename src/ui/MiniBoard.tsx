/**
 * Mini tablero ilustrativo para los tutoriales (SVG, sin interacción).
 * Coordenadas en celdas: viewBox = cols × rows.
 */

export interface MiniBoardProps {
  cols: number;
  rows: number;
  /** Color de fondo por celda (índice = fila * cols + columna). */
  fills?: Record<number, string>;
  /** Texto/emoji por celda. */
  texts?: Record<number, string>;
  /** Números en círculo oscuro (como en Hilo). */
  dots?: Record<number, string>;
  /** Trazo por centros de celdas. */
  path?: number[];
  /** Paredes entre celdas vecinas [a, b]. */
  walls?: [number, number][];
  /** Pistas = / × entre vecinas. */
  signs?: { a: number; b: number; kind: 'eq' | 'neq' }[];
  /** Rectángulos con borde (Parcelas). */
  rects?: {
    r: number;
    c: number;
    h: number;
    w: number;
    fill: string;
    dashed?: boolean;
  }[];
  /** Celdas a remarcar (borde grueso de color). */
  highlight?: number[];
  /** Bordes gruesos entre celdas de distinta zona. */
  regions?: number[];
  badge?: 'ok' | 'bad';
  label: string;
}

export default function MiniBoard(p: MiniBoardProps) {
  const { cols, rows } = p;
  const xy = (i: number) => [(i % cols) + 0.5, Math.floor(i / cols) + 0.5];
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg
        viewBox={`-0.06 -0.06 ${cols + 0.12} ${rows + 0.12}`}
        className="w-full"
        role="img"
        aria-label={p.label}
      >
        {cells.map((i) => (
          <rect
            key={`f${i}`}
            x={i % cols}
            y={Math.floor(i / cols)}
            width={1}
            height={1}
            fill={p.fills?.[i] ?? '#f8fafc'}
            stroke="rgba(15,23,42,0.18)"
            strokeWidth={0.03}
          />
        ))}
        {p.regions &&
          cells.flatMap((i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const out = [];
            if (c < cols - 1 && p.regions![i] !== p.regions![i + 1])
              out.push(
                <line
                  key={`rv${i}`}
                  x1={c + 1}
                  y1={r}
                  x2={c + 1}
                  y2={r + 1}
                  stroke="#1e293b"
                  strokeWidth={0.08}
                />,
              );
            if (r < rows - 1 && p.regions![i] !== p.regions![i + cols])
              out.push(
                <line
                  key={`rh${i}`}
                  x1={c}
                  y1={r + 1}
                  x2={c + 1}
                  y2={r + 1}
                  stroke="#1e293b"
                  strokeWidth={0.08}
                />,
              );
            return out;
          })}
        {p.rects?.map((q, k) => (
          <rect
            key={`q${k}`}
            x={q.c + 0.06}
            y={q.r + 0.06}
            width={q.w - 0.12}
            height={q.h - 0.12}
            rx={0.12}
            fill={q.fill}
            stroke={q.dashed ? '#6366f1' : '#334155'}
            strokeWidth={0.07}
            strokeDasharray={q.dashed ? '0.18 0.12' : undefined}
          />
        ))}
        {p.highlight?.map((i) => (
          <rect
            key={`h${i}`}
            x={(i % cols) + 0.05}
            y={Math.floor(i / cols) + 0.05}
            width={0.9}
            height={0.9}
            fill="none"
            stroke="#dc2626"
            strokeWidth={0.08}
            rx={0.08}
          />
        ))}
        {p.path && p.path.length > 1 && (
          <polyline
            points={p.path.map((i) => xy(i).join(',')).join(' ')}
            fill="none"
            stroke="#6366f1"
            strokeWidth={0.36}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {p.walls?.map(([a, b]) => {
          const r = Math.floor(a / cols);
          const c = a % cols;
          const v = b === a + 1;
          return (
            <line
              key={`w${a}-${b}`}
              x1={v ? c + 1 : c}
              y1={v ? r : r + 1}
              x2={c + 1}
              y2={r + 1}
              stroke="#0f172a"
              strokeWidth={0.12}
              strokeLinecap="round"
            />
          );
        })}
        {cells.map((i) =>
          p.texts?.[i] ? (
            <text
              key={`t${i}`}
              x={xy(i)[0]}
              y={xy(i)[1]}
              dy="0.35em"
              textAnchor="middle"
              fontSize={0.55}
              fontWeight={700}
              fill="#0f172a"
            >
              {p.texts[i]}
            </text>
          ) : null,
        )}
        {cells.map((i) =>
          p.dots?.[i] ? (
            <g key={`d${i}`}>
              <circle cx={xy(i)[0]} cy={xy(i)[1]} r={0.3} fill="#0f172a" />
              <text
                x={xy(i)[0]}
                y={xy(i)[1]}
                dy="0.35em"
                textAnchor="middle"
                fontSize={0.34}
                fontWeight={700}
                fill="#fff"
              >
                {p.dots[i]}
              </text>
            </g>
          ) : null,
        )}
        {p.signs?.map((s, k) => {
          const [ax, ay] = xy(s.a);
          const [bx, by] = xy(s.b);
          const [x, y] = [(ax + bx) / 2, (ay + by) / 2];
          return (
            <g key={`s${k}`}>
              <circle
                cx={x}
                cy={y}
                r={0.17}
                fill="#fff"
                stroke="#94a3b8"
                strokeWidth={0.02}
              />
              <text
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                fontSize={0.26}
                fontWeight={700}
                fill="#334155"
              >
                {s.kind === 'eq' ? '=' : '×'}
              </text>
            </g>
          );
        })}
        <rect
          x={0}
          y={0}
          width={cols}
          height={rows}
          fill="none"
          stroke="#1e293b"
          strokeWidth={0.1}
          rx={0.1}
        />
      </svg>
      {p.badge && (
        <span
          aria-hidden
          className={`absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg font-black text-white shadow ${
            p.badge === 'ok' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {p.badge === 'ok' ? '✓' : '✗'}
        </span>
      )}
    </div>
  );
}
