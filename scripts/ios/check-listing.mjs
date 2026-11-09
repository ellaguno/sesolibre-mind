#!/usr/bin/env node
/**
 * Comprueba los límites de Apple en docs/APP-STORE-LISTING.md: subtítulo 30,
 * texto promocional 170, palabras clave 100 (sin espacios tras las comas, sin
 * repetir palabras del nombre o el subtítulo) y descripción 4000.
 */
import { readFileSync } from 'node:fs';

const md = readFileSync(new URL('../../docs/APP-STORE-LISTING.md', import.meta.url), 'utf8');
const NAME = 'SesoLibre Mind';
const LIMITS = { subtitle: 30, promo: 170, keywords: 100, description: 4000 };
const LABELS = {
  subtitle: /\*\*(Subtítulo|Subtitle) \(30\)/,
  promo: /\*\*(Texto promocional|Promotional text) \(170\)/,
  keywords: /\*\*(Palabras clave|Keywords) \(100/,
  description: /\*\*(Descripción|Description) \(4000\)/,
};

let ok = true;
for (const section of md.split(/\n## /).filter((s) => /^(2|3)\./.test(s))) {
  const lang = section.split('\n')[0];
  const fields = {};
  for (const [field, re] of Object.entries(LABELS)) {
    const at = section.search(re);
    if (at < 0) continue;
    const block = section.slice(at).match(/```\n([\s\S]*?)\n```/);
    fields[field] = block ? block[1] : '';
  }
  console.log(`\n${lang}`);
  for (const [field, text] of Object.entries(fields)) {
    const len = [...text].length;
    const bad = len > LIMITS[field];
    if (bad) ok = false;
    console.log(`  ${bad ? '✗' : '✓'} ${field}: ${len}/${LIMITS[field]}`);
  }
  const kw = fields.keywords ?? '';
  if (/,\s/.test(kw)) {
    ok = false;
    console.log('  ✗ palabras clave: hay espacios después de las comas');
  }
  const taken = `${NAME} ${fields.subtitle ?? ''}`.toLowerCase();
  const dup = kw.split(',').filter((w) => taken.split(/[^\p{L}]+/u).includes(w.toLowerCase()));
  if (dup.length) console.log(`  ⚠ palabras clave ya en nombre/subtítulo (se desperdician): ${dup.join(', ')}`);
}
process.exit(ok ? 0 : 1);
