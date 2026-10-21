/**
 * Valida el HTML generado: JSON-LD parseable y enlaces internos existentes.
 * Requiere haber ejecutado `npm run build`.
 * Uso: node scripts/validate-html.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'dist';
const errors = [];
const pages = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) pages.push(full);
  }
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('No existe dist/. Ejecuta `npm run build` antes de validar el HTML.');
  process.exit(1);
}

walk(root);

let jsonLdBlocks = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    jsonLdBlocks += 1;
    try {
      const schema = JSON.parse(match[1]);
      if (!schema['@context'] || !schema['@type']) {
        errors.push(`${page}: JSON-LD sin @context o @type`);
      }
    } catch (error) {
      errors.push(`${page}: JSON-LD inválido (${error.message})`);
    }
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let url = match[1];
    if (/^(#|mailto:|tel:|data:|javascript:)/.test(url)) continue;

    if (/^https?:/.test(url)) {
      if (!url.startsWith('https://convertilocal.com')) continue;
      url = new URL(url).pathname;
    }

    const clean = url.split(/[?#]/)[0];
    if (!clean) continue;

    const relative = clean.replace(/^\//, '');
    const candidates = [join(root, relative), join(root, relative, 'index.html')];
    if (!candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile())) {
      errors.push(`${page}: enlace interno roto -> ${match[1]}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ HTML inválido: ${errors.length} problema(s)`);
  for (const error of errors) console.error(`  · ${error}`);
  process.exit(1);
}

console.log(
  `✓ HTML válido: ${pages.length} páginas, ${jsonLdBlocks} bloques JSON-LD y sin enlaces internos rotos.`,
);
