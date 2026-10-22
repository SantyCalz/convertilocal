/**
 * Genera `assets-integrity.json`: los hashes SHA-256 de los assets
 * autoalojados que el sitio descarga en `prebuild` (@imgly/background-removal
 * y Ghostscript WASM).
 *
 * Fijar los hashes permite que el build detecte cualquier cambio en los
 * hosts externos y garantiza que el material servido es exactamente el que
 * se auditó.
 *
 * Uso: node scripts/write-assets-integrity.mjs
 */
/**
 * scripts/write-assets-integrity.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TARGET = join(ROOT, 'assets-integrity.json');

/**
 * Directorios autoalojados que se sirven al navegador y cuyos hashes fijamos.
 * Cada uno se identifica por el prefijo que llevan en el manifiesto.
 */
const DIRECTORIES = [
  { dir: 'public/assets/imgly', prefix: '', resourcesFile: 'resources.json', package: '@imgly/background-removal@1.7.0' },
  { dir: 'public/assets/gs', prefix: 'gs/', package: '@jspawn/ghostscript-wasm@0.0.2' },
];

const files = {};
let totalBytes = 0;
let count = 0;
const directories = {};

for (const { dir, prefix, resourcesFile, package: packageName } of DIRECTORIES) {
  const fullDir = join(ROOT, dir);
  if (!existsSync(fullDir)) continue;

  let resourcesBuffer = null;
  let resources = null;

  if (resourcesFile && existsSync(join(fullDir, resourcesFile))) {
    resourcesBuffer = readFileSync(join(fullDir, resourcesFile));
    resources = JSON.parse(resourcesBuffer.toString('utf8'));
  }

  const entries = readdirSync(fullDir).filter((name) => {
    const path = join(fullDir, name);
    return statSync(path).isFile();
  });

  for (const entry of entries) {
    const path = join(fullDir, entry);
    const buffer = readFileSync(path);
    const manifestName = `${prefix}${entry}`;

    files[manifestName] = {
      bytes: buffer.length,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
    totalBytes += buffer.length;
    count += 1;
  }

  directories[dir] = {
    package: packageName,
    files: entries.length,
    resources: resourcesFile ? `${prefix}${resourcesFile}` : null,
  };

  if (resourcesBuffer && resourcesFile) {
    directories[dir].resourcesIndex = Object.fromEntries(
      Object.entries(resources).map(([key, entry]) => [
        key,
        {
          bytes: entry.size ?? null,
          mime: entry.mime ?? null,
          chunks: (entry.chunks ?? []).length,
        },
      ]),
    );
  }
}

if (count === 0) {
  console.error('No hay assets para fijar. Ejecuta los scripts de sincronización primero.');
  process.exit(1);
}

const manifest = {
  $comment:
    'Hashes de los assets autoalojados que se sirven al navegador. ' +
    'Los verifica scripts/sync-bg-assets.mjs y scripts/sync-gs-assets.mjs durante el prebuild. ' +
    'Regenerar con: node scripts/write-assets-integrity.mjs',
  directories,
  files,
};

writeFileSync(TARGET, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `✓ assets-integrity.json generado: ${count} ficheros ` +
    `(${(totalBytes / 1048576).toFixed(1)} MB).`,
);
