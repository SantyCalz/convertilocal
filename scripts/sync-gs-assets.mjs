/**
 * Sincroniza los assets de @jspawn/ghostscript-wasm en public/assets/gs/.
 *
 * El binario se sirve desde el propio dominio, igual que ffmpeg.wasm. Los
 * recursos PostScript y el perfil ICC se necesitan para la conversión a
 * PDF/A y se autoalojan junto al binario.
 *
 * Los hashes de todo lo servido están fijados en `assets-integrity.json` y se
 * verifican en cada sincronización, de modo que un cambio en los hosts externos
 * hace fallar el build en lugar de desplegar algo distinto de lo auditado.
 *
 * Uso:
 *   node scripts/sync-gs-assets.mjs                # descarga y copia todo
 *   node scripts/sync-gs-assets.mjs --check        # solo verifica, no descarga
 */
/**
 * scripts/sync-gs-assets.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';

const root = process.cwd();
const source = join(root, 'node_modules', '@jspawn', 'ghostscript-wasm');
const target = join(root, 'public', 'assets', 'gs');
const integrityPath = join(root, 'assets-integrity.json');

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const checkOnly = has('check');

if (!existsSync(source)) {
  console.error('No se encontró @jspawn/ghostscript-wasm. Ejecuta "npm install" primero.');
  process.exit(1);
}

const integrity = existsSync(integrityPath) ? JSON.parse(readFileSync(integrityPath, 'utf8')) : null;
if (!integrity) {
  console.error(
    '✗ No existe assets-integrity.json. Genera el manifiesto con ' +
      '"node scripts/write-assets-integrity.mjs" y versiona el resultado.',
  );
  process.exit(1);
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} para ${url}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

function verify(name, buffer) {
  const reference = integrity.files?.[name];
  if (!reference) {
    throw new Error(
      `${name} no está fijado en assets-integrity.json. Regenera el manifiesto con "node scripts/write-assets-integrity.mjs".`,
    );
  }
  const actual = sha256(buffer);
  if (buffer.length !== reference.bytes || actual !== reference.sha256) {
    throw new Error(
      `${name} no coincide con el hash fijado.\n` +
        `  esperado: ${reference.bytes} bytes / ${reference.sha256}\n` +
        `  obtenido: ${buffer.length} bytes / ${actual}\n` +
        '  El host externo ha cambiado el contenido o se ha alterado el fichero.',
    );
  }
}

mkdirSync(target, { recursive: true });

const resources = [
  {
    file: 'PDFA_def.ps',
    url: 'https://raw.githubusercontent.com/ArtifexSoftware/ghostpdl/ghostpdl-9.56.0/lib/PDFA_def.ps',
  },
  {
    file: 'srgb.icc',
    url: 'https://raw.githubusercontent.com/ArtifexSoftware/ghostpdl/ghostpdl-9.56.0/iccprofiles/srgb.icc',
  },
];

const files = ['gs.js', 'gs.wasm', 'gs.mjs', 'PDFA_def.ps', 'srgb.icc'];

if (checkOnly) {
  let missing = 0;
  let corrupt = 0;

  for (const file of files) {
    const path = join(target, file);
    if (!existsSync(path)) {
      missing += 1;
      console.error(`  · falta ${file}`);
      continue;
    }
    try {
      verify('gs/' + file, readFileSync(path));
    } catch (error) {
      corrupt += 1;
      console.error(`  · ${error.message}`);
    }
  }

  if (missing > 0 || corrupt > 0) {
    console.error(
      `✗ Assets de Ghostscript incompletos o alterados (${missing} faltan, ${corrupt} no coinciden).`,
    );
    console.error('  Ejecuta "npm run sync:gs" para descargarlos.');
    process.exit(1);
  }

  console.log(`✓ Assets de Ghostscript completos y verificados (${files.length} ficheros).`);
  process.exit(0);
}

for (const file of ['gs.js', 'gs.wasm', 'gs.mjs']) {
  const from = join(source, file);
  if (!existsSync(from)) {
    console.error(`No existe ${from}.`);
    process.exit(1);
  }
  const buffer = readFileSync(from);
  verify('gs/' + file, buffer);
  writeFileSync(join(target, file), buffer);
  console.log(`  ✓ ${file} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

for (const resource of resources) {
  try {
    const buffer = await fetchBuffer(resource.url);
    verify('gs/' + resource.file, buffer);
    writeFileSync(join(target, resource.file), buffer);
    console.log(`  ✓ ${resource.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    console.error(`  ✗ ${resource.file}: ${error.message}`);
    process.exit(1);
  }
}

console.log(`✓ Assets de Ghostscript WASM sincronizados en public/assets/gs/.`);
console.log('  Registra o actualiza los hashes con: node scripts/write-assets-integrity.mjs');
