import { useEffect, useState } from 'react';
import { animationsEnabled } from '../core/settings';
import Mascot, { type MascotPose } from './Mascot';

/**
 * Animación breve de la mascota encima de la pantalla: aparece, hace su gesto
 * y se desvanece. No bloquea toques (pointer-events: none) y no se muestra si
 * las animaciones están apagadas o el sistema pide reducir movimiento.
 *   lift   — al abrir la app (fondo de la app, ~1.2 s)
 *   puzzle — al abrir una actividad (fondo translúcido, ~0.8 s)
 */
export default function MascotIntro({ pose }: { pose: MascotPose }) {
  const ms = pose === 'lift' ? 1300 : 800;
  const [on, setOn] = useState(
    // En el modo capturas de la tienda no debe salir encima de las pantallas.
    () => animationsEnabled() && import.meta.env.VITE_SHOTS !== '1',
  );
  useEffect(() => {
    if (!on) return;
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  if (!on) return null;
  return (
    <div
      className={`mascot-intro pointer-events-none fixed inset-0 z-50 flex items-center justify-center ${
        pose === 'lift' ? 'bg-app-bg' : 'bg-app-bg/60'
      }`}
      style={{ animationDuration: `${ms}ms` }}
      aria-hidden
    >
      <Mascot pose={pose} className={pose === 'lift' ? 'h-40 w-40' : 'h-32 w-32'} />
    </div>
  );
}
