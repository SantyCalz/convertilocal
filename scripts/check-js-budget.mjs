/**
 * Comprueba el presupuesto de JavaScript inicial del build estático.
 *
 * Para cada HTML de dist/ sigue los <script src> y <link rel="modulepreload">
 * y, después, sus imports estáticos. Los chunks que solo se cargan con
 * import() dinámico (codecs, heic2any, fflate, procesadores) no cuentan.
 *
 * Uso: node scripts/check-js-budget.mjs [--kb=50]
 */
/**
 * scripts/check-js-budget.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const arg = process.argv.find((value) => value.startsWith('--kb='));
const LIMIT_KB = Number(arg?.split('=')[1] ?? process.env.JS_BUDGET_KB ?? 50);
const LIMIT_BYTES = LIMIT_KB * 1024;

/**
 * Límite por chunk lazy (carga diferida con import()).
 *
 * Los binarios `.wasm` quedan fuera: los decodificadores AVIF, HEIC, ONNX y
 * Ghostscript se descargan por separado y su tamaño depende del códec, no del
 * código que escribimos. Los `.js` y `.mjs` sí se miden.
 */
const LAZY_LIMIT_KB = Number(process.env.LAZY_CHUNK_BUDGET_KB ?? 400);
const LAZY_LIMIT_BYTES = LAZY_LIMIT_KB * 1024;

if (!Number.isFinite(LIMIT_KB) || LIMIT_KB <= 0) {
  console.error('Presupuesto inválido. Usa --kb=50');
  process.exit(1);
}

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

if (!existsSync(DIST)) {
  console.error(`No existe ${DIST}/. Ejecuta "npm run build" primero.`);
  process.exit(1);
}

const allFiles = walk(DIST);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));

if (htmlFiles.length === 0) {
  console.error('No se encontró HTML en dist/. Revisa el build.');
  process.exit(1);
}

/** @param {string} assetPath */
function distPathFromUrl(assetPath) {
  const clean = assetPath.split('?')[0].split('#')[0].replaceAll('\\', '/');
  const relativePath = clean.replace(/^\//, '');
  return join(DIST, relativePath);
}

/** @param {string} html */
function referencedScripts(html) {
  const urls = new Set();
  const patterns = [
    /<script[^>]+src=["']([^"']+\.js)["']/g,
    /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+\.js)["']/g,
    /<link[^>]+href=["']([^"']+\.js)["'][^>]+rel=["']modulepreload["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) urls.add(match[1]);
    }
  }
  return [...urls].map(distPathFromUrl).filter((file) => existsSync(file));
}

/** @param {string} file @param {Set<string>} seen */
function addStaticImports(file, seen) {
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  const importPattern = /(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g;
  for (const match of code.matchAll(importPattern)) {
    const imported = resolve(dirname(file), match[1]);
    if (existsSync(imported)) addStaticImports(imported, seen);
  }
}

const cache = new Map();
/** @param {string} file */
function gzipSize(file) {
  if (!cache.has(file)) cache.set(file, gzipSync(readFileSync(file), { level: 9 }).byteLength);
  return cache.get(file);
}

/** @param {string} file */
function rawSize(file) {
  return statSync(file).size;
}

const pageRows = [];
const allInitial = new Set();

for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile, 'utf8');
  const initial = new Set();
  for (const script of referencedScripts(html)) addStaticImports(script, initial);
  for (const asset of initial) allInitial.add(asset);

  const gzip = [...initial].reduce((sum, file) => sum + gzipSize(file), 0);
  pageRows.push({
    page: relative(DIST, htmlFile).replaceAll('\\', '/'),
    files: [...initial].map((file) => relative(DIST, file).replaceAll('\\', '/')),
    raw: [...initial].reduce((sum, file) => sum + rawSize(file), 0),
    gzip,
  });
}

pageRows.sort((a, b) => b.gzip - a.gzip);

const allJs = allFiles.filter((file) => file.endsWith('.js') || file.endsWith('.mjs'));
const lazy = allJs.filter((file) => !allInitial.has(file));

/**
 * Los binarios `.wasm` quedan fuera del presupuesto de chunks diferidos:
 * AVIF (1,1 MB), ONNX (5,4 MB) y Ghostscript (15,8 MB) se descargan bajo
 * demanda y su tamaño depende del códec, no del código que escribimos.
 * La excepción para Ghostscript está documentada en docs/LICENSE_AUDIT.md.
 */
const lazyJs = lazy.filter((file) => !file.endsWith('.wasm'));

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log('\nPresupuesto de JavaScript inicial (por página)\n');
console.log(`  ${'Página'.padEnd(52)} ${'Inicial'.padStart(10)} ${'Chunks'.padStart(7)}`);
for (const row of pageRows.slice(0, 12)) {
  console.log(
    `  ${row.page.padEnd(52)} ${kb(row.gzip).padStart(10)} ${String(row.files.length).padStart(7)}`,
  );
}

const max = pageRows[0];
if (!max) {
  console.error('No se pudo calcular el presupuesto.');
  process.exit(1);
}

console.log(`\n  Página más pesada: ${max.page}`);
console.log(`  JS inicial: ${kb(max.raw)} → ${kb(max.gzip)} gzip`);
console.log(`  Límite: ${LIMIT_KB} KB gzip`);
console.log(`  Chunks diferidos (no cuentan): ${lazy.length} (${lazyJs.length} JS, ${lazy.length - lazyJs.length} WASM)`);

if (max.gzip > LIMIT_BYTES) {
  console.error(`\n✗ Presupuesto inicial superado por ${kb(max.gzip - LIMIT_BYTES)}.\n`);
  console.error('  Chunks de la página:', max.files.join(', '));
  process.exit(1);
}

/* Presupuesto por chunk lazy. */
const lazyRows = lazyJs
  .map((file) => ({ file: relative(DIST, file).replaceAll('\\', '/'), gzip: gzipSize(file) }))
  .sort((a, b) => b.gzip - a.gzip);

const lazyTooBig = lazyRows.filter((row) => row.gzip > LAZY_LIMIT_BYTES);

console.log(`\nPresupuesto de chunks diferidos (por chunk)\n`);
console.log(`  ${'Chunk'.padEnd(52)} ${'gzip'.padStart(10)}`);
for (const row of lazyRows.slice(0, 6)) {
  console.log(`  ${row.file.padEnd(52)} ${kb(row.gzip).padStart(10)}`);
}
console.log(`  Límite por chunk: ${LAZY_LIMIT_KB} KB gzip`);

if (lazyTooBig.length > 0) {
  console.error(`\n✗ ${lazyTooBig.length} chunk(s) diferido(s) superan el presupuesto:\n`);
  for (const row of lazyTooBig) {
    console.error(`  · ${row.file}: ${kb(row.gzip)} (excede en ${kb(row.gzip - LAZY_LIMIT_BYTES)})`);
  }
  process.exit(1);
}

console.log(
  `\n✓ Dentro del presupuesto (${kb(LIMIT_BYTES - max.gzip)} de margen inicial, ` +
    `${lazyRows.length} chunks diferidos dentro de ${LAZY_LIMIT_KB} KB).\n`,
);
