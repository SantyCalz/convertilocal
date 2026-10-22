/**
 * Sincroniza los assets de @imgly/background-removal en public/assets/imgly/.
 *
 * La librería resuelve cada fragmento de un recurso con
 * `new URL(chunk.name, publicPath)`, es decir, de forma plana justo debajo de
 * `publicPath`. Por eso los ficheros se guardan con el nombre del hash del
 * fragmento y no dentro de una carpeta por recurso: cualquier otra ruta
 * devolvería un 404 y el modelo nunca llegaría a cargarse.
 *
 * Los hashes SHA-256 de todo lo descargado están fijados en
 * `assets-integrity.json` y se verifican en cada descarga. Así el material
 * servido es exactamente el auditado y un cambio en los hosts externos hace
 * fallar el build en lugar de desplegar algo distinto de lo revisado.
 *
 * Uso:
 *   node scripts/sync-bg-assets.mjs                # descarga los recursos por defecto
 *   node scripts/sync-bg-assets.mjs --check        # solo verifica, no descarga
 *   node scripts/sync-bg-assets.mjs --only=a,b     # recursos concretos
 *   node scripts/sync-bg-assets.mjs --force        # vuelve a descargar todo
 */
/**
 * scripts/sync-bg-assets.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';

const root = process.cwd();
const assetTarget = join(root, 'public', 'assets', 'imgly');
const legacyModelTarget = join(root, 'public', 'models');
const integrityPath = join(root, 'assets-integrity.json');
const version = '1.7.0';
const baseUrl = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`;

/**
 * Recursos que usa la herramienta «Eliminar fondo».
 * Los modelos pesan 42 MB (small) y 84 MB (medium); el runtime de ONNX 11 MB
 * para CPU y 22 MB para WebGPU.
 */
const DEFAULT_RESOURCES = [
  '/models/isnet_quint8',
  '/models/isnet_fp16',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
];

const args = process.argv.slice(2);
const flag = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const has = (name) => args.includes(`--${name}`);

const checkOnly = has('check');
const force = has('force');
const only = flag('only');
const selected = only
  ? only.split(',').map((key) => key.trim()).filter(Boolean)
  : DEFAULT_RESOURCES;

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirects > 5) {
            reject(new Error(`Demasiadas redirecciones para ${url}`));
            return;
          }
          resolve(fetchBuffer(new URL(response.headers.location, url).toString(), redirects + 1));
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`HTTP ${status} para ${url}`));
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

function humanBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/**
 * Hashes fijados de todo lo que se sirve desde `public/assets/imgly/`.
 * Sin este fichero el build no puede garantizar que lo descargado es lo
 * auditado, así que se falla en lugar de continuar a ciegas.
 */
const integrity = existsSync(integrityPath)
  ? JSON.parse(readFileSync(integrityPath, 'utf8'))
  : null;

if (!integrity) {
  console.error(
    '✗ No existe assets-integrity.json con los hashes de los assets de @imgly.\n' +
      '  Genera el manifiesto con "node scripts/write-assets-integrity.mjs" y versiona el resultado.',
  );
  process.exit(1);
}

/** Comprueba un fichero contra el hash fijado y lanza si no coincide. */
function assertIntegrity(name, buffer, expectedBytes) {
  const expected = integrity.files?.[name];
  const expectedResources = name === 'resources.json' ? integrity.resources : null;
  const reference = expected ?? expectedResources;

  if (!reference) {
    throw new Error(
      `${name} no está fijado en assets-integrity.json. Si es un recurso nuevo, ` +
        'regenera el manifiesto con "node scripts/write-assets-integrity.mjs".',
    );
  }

  if (expectedBytes !== undefined && buffer.length !== expectedBytes) {
    throw new Error(
      `${name} mide ${buffer.length} bytes y se esperaban ${expectedBytes}.`,
    );
  }

  const actual = sha256(buffer);
  if (actual !== reference.sha256) {
    throw new Error(
      `${name} no coincide con el hash fijado.\n` +
        `  esperado: ${reference.sha256}\n` +
        `  obtenido: ${actual}\n` +
        '  El host externo ha cambiado el contenido o se ha alterado el fichero. ' +
        'Revisa el cambio antes de regenerar el manifiesto.',
    );
  }
}

/** Descarga un fragmento y lo deja en `target` solo si el tamaño es correcto. */
async function syncChunk(chunk, target) {
  const expected = chunk.offsets[1] - chunk.offsets[0];

  if (!force && existsSync(target) && statSync(target).size === expected) {
    // Ya está en caché: aun así se comprueba el hash, que es lo que fija.
    assertIntegrity(chunk.name, readFileSync(target), expected);
    return 'cached';
  }

  const url = new URL(chunk.name, baseUrl).toString();
  const buffer = await fetchBuffer(url);

  if (buffer.length !== expected) {
    throw new Error(
      `El fragmento ${chunk.name} mide ${buffer.length} bytes y se esperaban ${expected}.`,
    );
  }

  assertIntegrity(chunk.name, buffer, expected);

  const partial = `${target}.part`;
  writeFileSync(partial, buffer);
  renameSync(partial, target);
  return 'downloaded';
}

mkdirSync(assetTarget, { recursive: true });

const resourcesPath = join(assetTarget, 'resources.json');
let resources;

if (!force && existsSync(resourcesPath)) {
  const buffer = readFileSync(resourcesPath);
  assertIntegrity('resources.json', buffer);
  resources = JSON.parse(buffer.toString('utf8'));
} else {
  const buffer = await fetchBuffer(new URL('resources.json', baseUrl).toString());
  assertIntegrity('resources.json', buffer);
  resources = JSON.parse(buffer.toString('utf8'));
  writeFileSync(resourcesPath, buffer);
}

const missing = selected.filter((key) => !resources[key]);
if (missing.length > 0) {
  console.error(`✗ recursos desconocidos en resources.json: ${missing.join(', ')}`);
  process.exit(1);
}

const expectedFiles = new Set(['resources.json']);
for (const key of selected) {
  for (const chunk of resources[key].chunks ?? []) {
    expectedFiles.add(chunk.name);
  }
}

let downloaded = 0;
let cached = 0;
let totalBytes = 0;

try {
  for (const key of selected) {
    const entry = resources[key];
    const chunks = entry.chunks ?? [];

    for (const chunk of chunks) {
      const target = join(assetTarget, chunk.name);
      const result = await syncChunk(chunk, target);
      if (result === 'downloaded') downloaded += 1;
      else cached += 1;
      totalBytes += chunk.offsets[1] - chunk.offsets[0];
    }

    if (!checkOnly) {
      console.log(`  · ${key} → ${chunks.length} fragmento(s), ${humanBytes(entry.size ?? 0)}`);
    }
  }
} catch (error) {
  // Si ya está todo descargado, un fallo de red no debe tumbar el build.
  const complete = [...expectedFiles].every((name) => {
    const path = join(assetTarget, name);
    return existsSync(path) && statSync(path).size > 0;
  });

  if (complete) {
    console.warn(
      `⚠ No se pudieron actualizar los assets de background-removal (${error.message}). ` +
        'Se usan los que ya estaban en public/assets/imgly/.',
    );
  } else {
    console.error(`✗ No se pudieron sincronizar los assets de background-removal: ${error.message}`);
    console.error('  Vuelve a ejecutar "npm run sync:bg" cuando haya conexión.');
    process.exit(1);
  }
}

/** Elimina restos de la distribución anterior (carpetas por recurso). */
if (!checkOnly) {
  for (const entry of readdirSync(assetTarget, { withFileTypes: true })) {
    if (entry.isFile() && !expectedFiles.has(entry.name)) {
      rmSync(join(assetTarget, entry.name));
    }
  }
  for (const entry of readdirSync(assetTarget, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      rmSync(join(assetTarget, entry.name), { recursive: true, force: true });
    }
  }
  if (existsSync(legacyModelTarget)) {
    rmSync(legacyModelTarget, { recursive: true, force: true });
  }
}

if (checkOnly) {
  const missingFiles = [...expectedFiles].filter(
    (name) => !existsSync(join(assetTarget, name)),
  );
  if (missingFiles.length > 0) {
    console.error(`✗ Faltan ${missingFiles.length} asset(s) en public/assets/imgly/.`);
    console.error('  Ejecuta "npm run sync:bg" para descargarlos.');
    process.exit(1);
  }

  // Comprobar el hash de todo lo presente, no solo que exista.
  let corrupt = 0;
  for (const name of expectedFiles) {
    try {
      assertIntegrity(name, readFileSync(join(assetTarget, name)));
    } catch (error) {
      corrupt += 1;
      console.error(`  · ${error.message}`);
    }
  }
  if (corrupt > 0) {
    console.error(`✗ ${corrupt} asset(s) no coinciden con assets-integrity.json.`);
    process.exit(1);
  }

  console.log(
    `✓ Assets de background-removal completos y verificados ` +
      `(${expectedFiles.size} ficheros, hashes de assets-integrity.json correctos).`,
  );
  process.exit(0);
}

console.log(
  `✓ Assets de background-removal ${version} sincronizados en public/assets/imgly/ ` +
    `(${downloaded} descargados, ${cached} en caché, ${humanBytes(totalBytes)}).`,
);
