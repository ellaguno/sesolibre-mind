/** Una palabra con su pista (la pista se usa en el crucigrama). */
export interface WordEntry {
  w: string;
  c: string;
}

/** Tema de palabras, escrito directamente en su idioma (no traducido). */
export interface Theme {
  id: string;
  name: string;
  words: WordEntry[];
}
