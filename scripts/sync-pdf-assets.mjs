/**
 * Copia los assets de PDF.js desde node_modules a public/ para servirlos
 * desde el mismo origen. No se usa ningún CDN.
 *
 * Uso: node scripts/sync-pdf-assets.mjs
 */
/**
 * scripts/sync-pdf-assets.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packageJson = JSON.parse(readFileSync('node_modules/pdfjs-dist/package.json', 'utf8'));
const version = packageJson.version;
const source = 'node_modules/pdfjs-dist';
const target = 'public/assets/pdf';
const scriptsTarget = 'public/scripts';

if (!existsSync(source)) {
  console.error('No se encontró pdfjs-dist. Ejecuta "npm install" antes de sincronizar.');
  process.exit(1);
}

const workerSource = join(source, 'legacy/build/pdf.worker.min.mjs');
if (!existsSync(workerSource)) {
  console.error(`No existe ${workerSource}. Revisa la versión de pdfjs-dist.`);
  process.exit(1);
}

mkdirSync(scriptsTarget, { recursive: true });
mkdirSync(target, { recursive: true });

cpSync(workerSource, join(scriptsTarget, 'pdf.worker.min.mjs'));

for (const directory of ['wasm', 'cmaps', 'standard_fonts']) {
  const from = join(source, directory);
  if (existsSync(from)) cpSync(from, join(target, directory), { recursive: true });
}

// Licencias que deben viajar con los assets públicos.
for (const file of ['cmaps/LICENSE', 'standard_fonts/LICENSE_FOXIT', 'standard_fonts/LICENSE_LIBERATION']) {
  const from = join(source, file);
  if (existsSync(from)) {
    cpSync(from, join(target, file.replaceAll('/', '-')), { recursive: false });
  }
}
for (const file of ['LICENSE_JBIG2', 'LICENSE_OPENJPEG', 'LICENSE_PDFJS_JBIG2', 'LICENSE_PDFJS_OPENJPEG', 'LICENSE_PDFJS_QCMS', 'LICENSE_QCMS']) {
  const from = join(source, 'wasm', file);
  if (existsSync(from)) cpSync(from, join(target, 'wasm', file), { recursive: false });
}

writeFileSync(
  join(target, 'VERSION.txt'),
  `PDF.js ${version}\nGenerado por scripts/sync-pdf-assets.mjs. No editar a mano.\n`,
  'utf8',
);

console.log(`✓ Assets de PDF.js ${version} sincronizados en public/scripts y ${target}/.`);
