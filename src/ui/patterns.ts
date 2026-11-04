/**
 * Texturas para el modo daltónico: cada zona de color lleva además un patrón
 * distinto, para que se distinga sin depender del color. Se combinan con el
 * color de fondo (CSS background-image + background-size).
 */

const INK = 'rgba(15,23,42,0.30)';

export interface Pattern {
  image: string;
  size: string;
}

const stripes = (deg: number): Pattern => ({
  image: `repeating-linear-gradient(${deg}deg, ${INK} 0 2px, transparent 2px 9px)`,
  size: 'auto',
});

export const REGION_PATTERNS: Pattern[] = [
  { image: 'none', size: 'auto' }, // liso
  stripes(45),
  stripes(135),
  stripes(0),
  stripes(90),
  { image: `radial-gradient(${INK} 1.6px, transparent 1.8px)`, size: '9px 9px' }, // puntos
  {
    image: `linear-gradient(${INK} 1.5px, transparent 1.5px), linear-gradient(90deg, ${INK} 1.5px, transparent 1.5px)`,
    size: '10px 10px, 10px 10px',
  }, // cuadrícula
  {
    image: `repeating-linear-gradient(45deg, ${INK} 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(135deg, ${INK} 0 1.5px, transparent 1.5px 9px)`,
    size: 'auto, auto',
  }, // rombos
  { image: `radial-gradient(${INK} 3px, transparent 3.4px)`, size: '14px 14px' }, // lunares
  {
    image: `conic-gradient(${INK} 25%, transparent 0 50%, ${INK} 0 75%, transparent 0)`,
    size: '12px 12px',
  }, // damero
];

/** Une capas de fondo (primero las de encima) en propiedades CSS. */
export function layered(layers: (Pattern | null | undefined)[]): {
  backgroundImage?: string;
  backgroundSize?: string;
} {
  const ls = layers.filter((l): l is Pattern => !!l && l.image !== 'none');
  if (!ls.length) return {};
  return {
    backgroundImage: ls.map((l) => l.image).join(', '),
    backgroundSize: ls.map((l) => l.size).join(', '),
  };
}
