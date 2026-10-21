/**
 * scripts/verify-deployment.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

if (!existsSync(dist)) {
  console.error('No existe dist/. Ejecuta npm run build antes de verificar el despliegue.');
  process.exit(1);
}

const allFiles = walk(dist);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));

for (const required of ['index.html', 'robots.txt', 'ads.txt', 'sitemap-index.xml', '_headers']) {
  if (!existsSync(join(dist, required))) fail(`Falta ${required} en dist/`);
}

if (!existsSync('vercel.json')) fail('Falta vercel.json en la raíz del proyecto.');

if (htmlFiles.length < 75) fail(`Se esperaban al menos 75 páginas HTML, hay ${htmlFiles.length}.`);

let noindexOutsideDemo = 0;
let missingMeta = 0;
let redirectPages = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = file.replace(/^dist[\\/]/, '').replace(/\\/g, '/');

  // Las páginas de redirección generadas por Astro son mínimas: llevan
  // noindex y canonical, pero no los metadatos sociales de una página real.
  if (/http-equiv="refresh"/i.test(html)) {
    redirectPages += 1;
    if (!html.includes('<link rel="canonical"')) missingMeta += 1;
    continue;
  }

  if (relative !== 'demo-file-processor/index.html' && /noindex/i.test(html)) {
    noindexOutsideDemo += 1;
  }

  if (!html.includes('<link rel="canonical"')) missingMeta += 1;
  if (!html.includes('property="og:title"')) missingMeta += 1;
  if (!html.includes('name="twitter:card"')) missingMeta += 1;
  if (!/<html[^>]*lang="es"/.test(html)) missingMeta += 1;
}

if (noindexOutsideDemo > 0) fail(`Hay ${noindexOutsideDemo} páginas con noindex fuera de demo.`);
if (missingMeta > 0) fail(`Hay ${missingMeta} incidencias de metadatos SEO faltantes.`);

const sitemap = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
for (const route of ['/', '/convertir/', '/pdf/', '/media/', '/texto/']) {
  if (!sitemap.includes(route)) warn(`La ruta ${route} no aparece en el sitemap.`);
}

const ads = readFileSync(join(dist, 'ads.txt'), 'utf8');
if (ads.includes('pub-XXXXXXXXXXXXXXXX')) {
  warn('ads.txt sigue con el placeholder pub-XXXXXXXXXXXXXXXX. Reemplázalo antes de publicar.');
}

const headers = readFileSync(join(dist, '_headers'), 'utf8');
if (!headers.includes('/assets/wasm/*')) fail('Los headers de caché para WASM no están configurados.');
if (!headers.includes('/assets/imgly/*')) fail('Los headers de caché para los assets de fondo no están configurados.');

// Los assets de @imgly/background-removal se sirven desde el mismo origen:
// la librería resuelve cada fragmento como `new URL(chunk.name, publicPath)`.
const imglyDir = join(dist, 'assets', 'imgly');
if (!existsSync(join(imglyDir, 'resources.json'))) {
  fail('Faltan los assets de background-removal en dist/assets/imgly/. Ejecuta "npm run sync:bg".');
} else {
  const resources = JSON.parse(readFileSync(join(imglyDir, 'resources.json'), 'utf8'));
  const required = [
    '/models/isnet_quint8',
    '/models/isnet_fp16',
    '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
    '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
    '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
    '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
  ];

  let missingChunks = 0;
  for (const key of required) {
    const entry = resources[key];
    if (!entry) {
      fail(`El asset ${key} no aparece en resources.json.`);
      continue;
    }
    for (const chunk of entry.chunks ?? []) {
      const path = join(imglyDir, chunk.name);
      if (!existsSync(path)) {
        missingChunks += 1;
        continue;
      }
      const expected = chunk.offsets[1] - chunk.offsets[0];
      if (statSync(path).size !== expected) {
        missingChunks += 1;
      }
    }
  }

  if (missingChunks > 0) {
    fail(`Faltan ${missingChunks} fragmentos de los assets de background-removal.`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ Verificación de despliegue fallida (${errors.length}):\n`);
  for (const error of errors) console.error(`  · ${error}`);
  if (warnings.length > 0) {
    console.error('\nAvisos:');
    for (const warning of warnings) console.error(`  · ${warning}`);
  }
  console.error('');
  process.exit(1);
}

console.log(
  `\n✓ Despliegue verificado: ${htmlFiles.length} páginas HTML (${redirectPages} de redirección), ` +
    'metadatos OK y assets de caché configurados.',
);
if (warnings.length > 0) {
  console.log('Avisos:');
  for (const warning of warnings) console.log(`  · ${warning}`);
}
console.log('');
