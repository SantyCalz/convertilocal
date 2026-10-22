/**
 * Genera `assets-integrity.json`: los hashes SHA-256 de los assets de
 * @imgly/background-removal que el sitio descarga en `prebuild`.
 *
 * Fijar los hashes permite que el build detecte cualquier cambio en los
 * hosts externos y garantiza que el material servido es exactamente el que
 * se auditó.
 *
 * Uso: node scripts/write-assets-integrity.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ASSETS = join(ROOT, 'public', 'assets', 'imgly');
const TARGET = join(ROOT, 'assets-integrity.json');
const RESOURCES = 'resources.json';

if (!existsSync(join(ASSETS, RESOURCES))) {
  console.error('No existen los assets en public/assets/imgly/. Ejecuta "npm run sync:bg" primero.');
  process.exit(1);
}

const resourcesBuffer = readFileSync(join(ASSETS, RESOURCES));
const resources = JSON.parse(resourcesBuffer.toString('utf8'));

const files = {};
let totalBytes = 0;
let count = 0;

for (const entry of readdirSync(ASSETS)) {
  const path = join(ASSETS, entry);
  if (!statSync(path).isFile()) continue;
  if (entry === RESOURCES) continue;

  const buffer = readFileSync(path);
  files[entry] = {
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
  totalBytes += buffer.length;
  count += 1;
}

const manifest = {
  $comment:
    'Hashes de los assets de @imgly/background-removal servidos desde public/assets/imgly/. ' +
    'Los verifica scripts/sync-bg-assets.mjs durante el prebuild. ' +
    'Regenerar con: node scripts/write-assets-integrity.mjs',
  source: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
  package: '@imgly/background-removal@1.7.0',
  resources: {
    file: RESOURCES,
    bytes: resourcesBuffer.length,
    sha256: createHash('sha256').update(resourcesBuffer).digest('hex'),
  },
  resourcesIndex: Object.fromEntries(
    Object.entries(resources).map(([key, entry]) => [
      key,
      {
        bytes: entry.size ?? null,
        mime: entry.mime ?? null,
        chunks: (entry.chunks ?? []).length,
      },
    ]),
  ),
  files,
};

writeFileSync(TARGET, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `✓ assets-integrity.json generado: ${count} fragmentos (${(totalBytes / 1048576).toFixed(1)} MB) ` +
    `+ ${RESOURCES} fijados en ${(manifest.resources.bytes / 1024).toFixed(1)} KB.`,
);
