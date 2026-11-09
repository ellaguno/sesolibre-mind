import { useLayoutEffect, useRef } from 'react';

/**
 * Achica la letra de un texto de una sola línea lo justo para que quepa
 * (hasta `min` de su tamaño), en vez de recortarlo con «…». Útil con la letra
 * grande del sistema o del modo sereno. Se recalcula al cambiar el texto o el
 * tamaño, y cuando terminan de aplicarse la letra del sistema y las fuentes.
 */
export function useFitText<T extends HTMLElement>(text: string, min = 0.75) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      if (el.scrollWidth <= el.clientWidth) return;
      // En rem y no en px: el WebView multiplica los px por la escala de letra
      // del sistema, pero rem ya la lleva incluida en la raíz.
      const base = parseFloat(getComputedStyle(el).fontSize);
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const scale = Math.max(min, el.clientWidth / el.scrollWidth);
      el.style.fontSize = `${Math.floor((base / root) * scale * 1000) / 1000}rem`;
    };
    fit();
    // El WebView aplica la letra del sistema y las fuentes un instante después
    // del primer pintado: se vuelve a medir entonces y al cambiar el tamaño.
    const raf = requestAnimationFrame(fit);
    const late = setTimeout(fit, 400);
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(late);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [text, min]);
  return ref;
}
