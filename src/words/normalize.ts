/**
 * Letras para el tablero: mayúsculas y sin acentos ni diéresis, como en los
 * crucigramas impresos. La Ñ se conserva (es otra letra en español).
 */
export function toGridLetters(word: string): string[] {
  return [...word.toUpperCase()].map((ch) =>
    ch === 'Ñ' ? ch : ch.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  );
}
