import { useId } from 'react';

/**
 * La mascota de la app (el cerebro del ícono, misma geometría que
 * scripts/build-icons.py) con dos animaciones cortas (CSS en index.css):
 *   lift   — levanta la pesa dos veces (al abrir la app)
 *   puzzle — junta dos piezas de rompecabezas sobre su cabeza (al abrir una actividad)
 */
export type MascotPose = 'lift' | 'puzzle';

const BRAIN_D =
  'M420 722 Q383.5 751.4 363.6 707.1 Q317.7 715.9 318.4 665.5 Q272.2 651.8 293.3 605.4 Q256 572 293.3 538.6 Q272.2 492.2 318.4 478.5 Q317.7 428.1 363.6 436.9 Q383.5 392.6 420 422 L512 430 L512 716 Z M604 422 Q640.5 392.6 660.4 436.9 Q706.3 428.1 705.6 478.5 Q751.8 492.2 730.7 538.6 Q768 572 730.7 605.4 Q751.8 651.8 705.6 665.5 Q706.3 715.9 660.4 707.1 Q640.5 751.4 604 722 L512 716 L512 430 Z';
const ARMS_D =
  'M384 580 C 300 590, 250 520, 268 456 C 282 404, 350 392, 384 342 M640 580 C 724 590, 774 520, 756 456 C 742 404, 674 392, 640 342';
const GYRI_D =
  'M432 452 C 462 470, 462 500, 436 516 M592 452 C 562 470, 562 500, 588 516 M372 520 C 402 520, 412 540, 404 562 M652 520 C 622 520, 612 540, 620 562 M360 640 C 384 626, 402 640, 404 664 M664 640 C 640 626, 622 640, 620 664';

export default function Mascot({
  pose,
  className = 'h-32 w-32',
}: {
  pose: MascotPose;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const brand = `brand-${id}`;
  const arm = `arm-${id}`;
  return (
    <svg
      viewBox="236 236 552 540"
      className={`mascot mascot-${pose} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={brand} x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0" stopColor="#ffb21e" />
          <stop offset="0.45" stopColor="#f49200" />
          <stop offset="0.75" stopColor="#ef3f5a" />
          <stop offset="1" stopColor="#e5007e" />
        </linearGradient>
        <linearGradient
          id={arm}
          gradientUnits="userSpaceOnUse"
          x1="250"
          y1="0"
          x2="774"
          y2="0"
        >
          <stop offset="0" stopColor="#ffc46b" />
          <stop offset="1" stopColor="#ff6b9a" />
        </linearGradient>
      </defs>

      {pose === 'lift' && (
        <>
          {/* Brazos: se doblan desde los hombros (escala vertical). */}
          <g className="mascot-arms">
            <path
              d={ARMS_D}
              fill="none"
              stroke="#5a0838"
              strokeWidth="46"
              strokeLinecap="round"
            />
            <path
              d={ARMS_D}
              fill="none"
              stroke={`url(#${arm})`}
              strokeWidth="30"
              strokeLinecap="round"
            />
          </g>
          {/* Pesa y manos: bajan y suben con los brazos. */}
          <g className="mascot-bell">
            <rect x="352" y="330" width="320" height="22" rx="11" fill="#c9d0ff" />
            <rect x="328" y="284" width="40" height="114" rx="12" fill="#eef0ff" />
            <rect x="304" y="302" width="28" height="78" rx="10" fill="#b7bff7" />
            <rect x="656" y="284" width="40" height="114" rx="12" fill="#eef0ff" />
            <rect x="692" y="302" width="28" height="78" rx="10" fill="#b7bff7" />
            <circle cx="384" cy="341" r="27" fill="#5a0838" />
            <circle cx="640" cy="341" r="27" fill="#5a0838" />
            <circle cx="384" cy="341" r="20" fill="#ffc46b" />
            <circle cx="640" cy="341" r="20" fill="#ff6b9a" />
          </g>
        </>
      )}

      {pose === 'puzzle' && (
        <g>
          {/* Dos piezas que se encajan sobre la cabeza, y un destello. */}
          <g className="mascot-piece-left">
            <rect x="388" y="268" width="120" height="110" rx="14" fill="#22c55e" />
            <circle cx="508" cy="323" r="24" fill="#22c55e" />
          </g>
          <g className="mascot-piece-right">
            <path
              d="M516 268 h106 a14 14 0 0 1 14 14 v82 a14 14 0 0 1 -14 14 h-106 v-31 a24 24 0 0 0 0 -48 z"
              fill="#06b6d4"
            />
          </g>
          <g className="mascot-spark" fill="#fde047">
            <path d="M660 250 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10 z" />
          </g>
        </g>
      )}

      <g className="mascot-body">
        <path d={BRAIN_D} fill={`url(#${brand})`} />
        <path
          d="M512 432 L512 716"
          stroke="#8a0a4e"
          strokeOpacity="0.6"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={GYRI_D}
          fill="none"
          stroke="#8a0a4e"
          strokeOpacity="0.5"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M400 470 C 420 440, 455 428, 480 432"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.45"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <g className="mascot-eyes">
          <ellipse cx="466" cy="612" rx="27" ry="31" fill="#fff" />
          <ellipse cx="558" cy="612" rx="27" ry="31" fill="#fff" />
          <circle cx="471" cy="618" r="15" fill="#1b1036" />
          <circle cx="553" cy="618" r="15" fill="#1b1036" />
          <circle cx="476" cy="611" r="5" fill="#fff" />
          <circle cx="558" cy="611" r="5" fill="#fff" />
        </g>
        <path
          d="M480 672 Q 512 700, 544 672"
          fill="none"
          stroke="#1b1036"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <ellipse cx="428" cy="668" rx="21" ry="12" fill="#ff7aa8" opacity="0.6" />
        <ellipse cx="596" cy="668" rx="21" ry="12" fill="#ff7aa8" opacity="0.6" />
      </g>
    </svg>
  );
}
