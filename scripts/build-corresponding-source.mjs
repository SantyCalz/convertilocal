/**
 * Prepara el release «corresponding-source» con el código fuente del binario
 * ffmpeg-core.wasm que sirve el sitio.
 *
 * La GPL-2.0-or-later exige acompañar el programa del código fuente
 * correspondiente. Este script descarga las fuentes exactas con las que se
 * compiló el binario, copia los textos de licencia y genera un manifiesto con
 * el SHA-256 de cada fichero.
 *
 * Los tarball (18 MB) NO se versionan: se adjuntan al GitHub Release. Solo el
 * manifiesto, el BUILD.md y el CONFIGURATION.txt se versionan, en
 * `release/corresponding-source/`.
 *
 * Uso: node scripts/build-corresponding-source.mjs [--staging=<ruta>]
 */
/**
 * scripts/build-corresponding-source.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const argStaging = process.argv.find((arg) => arg.startsWith('--staging='))?.split('=')[1];
const STAGING = argStaging
  ? join(ROOT, argStaging)
  : join(ROOT, 'release-staging');

const RELEASE_VERSION = '1.1.0';
const RELEASE_TAG = `corresponding-source-v${RELEASE_VERSION}`;

/** Fuentes exactas de las que se compone el binario distribuido. */
const SOURCES = [
  {
    id: 'ghostscript',
    version: '9.56.0',
    license: 'AGPL-3.0-only',
    file: 'ghostscript-9.56.0.tar.xz',
    expectedSha512:
      '42233045041bdfaddead8b5ddc34cedda3148f150c9e906776a216cdb81b0cac3c52ce7b86e207c3eb9a00aeefa42e8bf83129f4112e01156638a96bcbc54d27',
    url: 'https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs9560/ghostscript-9.56.0.tar.xz',
  },
  {
    id: 'ffmpeg',
    version: 'n5.1.4',
    license: 'LGPL-2.1-or-later / GPL-2.0-or-later (build con --enable-gpl)',
    file: 'ffmpeg-n5.1.4.tar.gz',
    expectedSha256: '6ed8ba17d513955cd9a03d0d87195b8eac3d148dcb61ef30ebddf1a3cd718de8',
    url: 'https://github.com/FFmpeg/FFmpeg/archive/refs/tags/n5.1.4.tar.gz',
  },
  {
    id: 'x264',
    version: 'rama 4-cores (fork ffmpegwasm/x264)',
    license: 'GPL-2.0-or-later',
    file: 'x264-4-cores.tar.gz',
    expectedSha256: 'cc64a8972d47d835c9f7626b735bf270b81c9a8197c250e75dfe0dfdc7835b10',
    url: 'https://github.com/ffmpegwasm/x264/archive/refs/heads/4-cores.tar.gz',
  },
  {
    id: 'x265',
    version: 'tag 3.4 (fork ffmpegwasm/x265)',
    license: 'GPL-2.0-or-later',
    file: 'x265-3.4.tar.gz',
    expectedSha256: 'abd37f4ab99570fcf2272c47239653204b0854ea5ef19df3729112aaa1f6f311',
    url: 'https://github.com/ffmpegwasm/x265/archive/refs/tags/3.4.tar.gz',
  },
  {
    id: 'ffmpeg-wasm-build-scripts',
    version: 'v0.12.10 (commit c3a763857c5e615ae8674715ad5e4f63ff469e9d)',
    license: 'MIT (wrapper) — compila FFmpeg y sus forks bajo GPL/LGPL',
    file: 'ffmpegwasm-v0.12.10-build-scripts.tar.gz',
    expectedSha256: '3f1c3f94143d11e3bbb322bd8a1a3189965f31162cf7e889fd3b7e21a928d1ea',
    url: 'https://github.com/ffmpegwasm/ffmpeg.wasm/archive/refs/tags/v0.12.10.tar.gz',
  },
];

/** Textos de licencia que acompañan al release. */
const LICENSES = [
  ['GPL-2.0.txt', 'public/licencias/gpl-2.0.txt'],
  ['GPL-3.0.txt', 'public/licencias/gpl-3.0.txt'],
  ['LGPL-2.1.txt', 'public/licencias/lgpl-2.1.txt'],
  ['AGPL-3.0.txt', 'public/licencias/agpl-3.0.txt'],
  ['Apache-2.0.txt', 'public/licencias/apache-2.0.txt'],
  ['MIT.txt', 'public/licencias/mit.txt'],
  ['BSD-3-Clause.txt', 'public/licencias/bsd-3-clause.txt'],
  ['ISC.txt', 'public/licencias/isc.txt'],
];

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const sha512 = (buffer) => createHash('sha512').update(buffer).digest('hex');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function download(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'convertilocal-audit' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} para ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

mkdirSync(STAGING, { recursive: true });

const described = new Map();

for (const source of SOURCES) {
  const target = join(STAGING, source.file);
  process.stdout.write(`Descargando ${source.id}… `);
  try {
    // Si ya está descargado y su hash cuadra, no se vuelve a bajar.
    let buffer = null;
    if (existsSync(target)) {
      const existing = readFileSync(target);
      if (source.expectedSha256 && sha256(existing) === source.expectedSha256) buffer = existing;
      if (source.expectedSha512 && sha512(existing) === source.expectedSha512) buffer = existing;
    }
    if (!buffer) buffer = await download(source.url);

    const actual = sha256(buffer);
    if (source.expectedSha256 && actual !== source.expectedSha256) {
      throw new Error(
        `hash SHA-256 inesperado: ${actual} (se esperaba ${source.expectedSha256}). ` +
          'El origen remoto ha cambiado el contenido.',
      );
    }
    if (source.expectedSha512 && sha512(buffer) !== source.expectedSha512) {
      throw new Error(
        `hash SHA-512 inesperado: ${sha512(buffer)} (se esperaba ${source.expectedSha512}). ` +
          'El origen remoto ha cambiado el contenido.',
      );
    }

    writeFileSync(target, buffer);
    described.set(source.file, { ...source, bytes: buffer.length, sha256: actual });
    console.log(`${(buffer.length / 1048576).toFixed(1)} MB`);
  } catch (error) {
    console.log(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

for (const [name, origin] of LICENSES) {
  if (!existsSync(join(ROOT, origin))) continue;
  const buffer = readFileSync(join(ROOT, origin));
  writeFileSync(join(STAGING, name), buffer);
  described.set(name, {
    id: `license/${name}`,
    version: name,
    license: 'texto oficial de la licencia',
    file: name,
    url: 'fuente oficial (gnu.org, apache.org u OSI)',
    bytes: buffer.length,
    sha256: sha256(buffer),
  });
}

/* El binario distribuido y la configuración con la que se compiló. */
const wasmPath = join(ROOT, 'public', 'assets', 'wasm', 'ffmpeg-core.wasm');
if (!existsSync(wasmPath)) {
  console.error('No existe public/assets/wasm/ffmpeg-core.wasm. Ejecuta "npm run sync:media".');
  process.exit(1);
}

const wasm = readFileSync(wasmPath);
described.set('ffmpeg-core.wasm', {
  id: 'ffmpeg-core.wasm',
  version: '@ffmpeg/core 0.12.10',
  license: 'GPL-2.0-or-later',
  file: 'ffmpeg-core.wasm',
  url: 'https://www.npmjs.com/package/@ffmpeg/core',
  bytes: wasm.length,
  sha256: sha256(wasm),
});

/* El binario de Ghostscript que usa el conversor PDF/A. */
const gsWasmPath = join(ROOT, 'public', 'assets', 'gs', 'gs.wasm');
if (!existsSync(gsWasmPath)) {
  console.error('No existe public/assets/gs/gs.wasm. Ejecuta "npm run sync:gs".');
  process.exit(1);
}

const gsWasm = readFileSync(gsWasmPath);
described.set('gs.wasm', {
  id: 'gs.wasm',
  version: '@jspawn/ghostscript-wasm 0.0.2 (Ghostscript 9.56.0)',
  license: 'AGPL-3.0-only',
  file: 'gs.wasm',
  url: 'https://www.npmjs.com/package/@jspawn/ghostscript-wasm',
  bytes: gsWasm.length,
  sha256: sha256(gsWasm),
});

let current = '';
let configuration = null;
for (const byte of wasm) {
  if (byte >= 0x20 && byte <= 0x7e) current += String.fromCharCode(byte);
  else {
    const at = current.indexOf('configuration: --target-os=none');
    if (at !== -1) configuration = current.slice(at);
    current = '';
  }
}

if (!configuration) {
  console.error('No se pudo extraer la línea "configuration:" del binario.');
  process.exit(1);
}

writeFileSync(join(STAGING, 'CONFIGURATION.txt'), `${configuration}\n`, 'utf8');
described.set('CONFIGURATION.txt', {
  id: 'configuration',
  version: 'configuración de compilación del binario distribuido',
  license: '—',
  file: 'CONFIGURATION.txt',
  url: '—',
  bytes: Buffer.byteLength(`${configuration}\n`),
  sha256: sha256(`${configuration}\n`),
});

/* BUILD.md */
const buildMd = `# Código fuente correspondiente — ffmpeg-core.wasm y gs.wasm

Este directorio acompaña a los binarios \`ffmpeg-core.wasm\` y \`gs.wasm\` que
sirve ConvertiLocal. Cumple la GPL-2.0-or-later y la AGPL-3.0-only: los
binarios no han sido modificados, y aquí está el código fuente exacto con el
que se compilaron, junto con los scripts de compilación y los hashes de
verificación.

## Binarios distribuidos

| Campo | ffmpeg-core.wasm | gs.wasm |
| --- | --- | --- |
| Fichero | \`public/assets/wasm/ffmpeg-core.wasm\` | \`public/assets/gs/gs.wasm\` |
| Paquete | \`@ffmpeg/core@0.12.10\` | \`@jspawn/ghostscript-wasm@0.0.2\` |
| Versión upstream | FFmpeg n5.1.4 | Ghostscript 9.56.0 |
| Compilador | Emscripten 3.1.40 | Emscripten (build del paquete) |
| Licencia | GPL-2.0-or-later (build **GPL**) | AGPL-3.0-only |
| Modificado | **No** — se copia sin cambios desde el paquete npm | **No** — se copia sin cambios desde el paquete npm |

El hash SHA-256 de cada binario está en \`SOURCES.json\` (\`binaries\`) y en
\`public/licencias/ffmpeg-fuente.txt\`.

## Ghostscript (gs.wasm)

El binario \`gs.wasm\` procede de \`@jspawn/ghostscript-wasm@0.0.2\`, que
empaqueta Ghostscript 9.56.0 compilado con Emscripten. El código fuente
correspondiente es el tarball oficial \`ghostscript-9.56.0.tar.xz\` publicado
por Artifex en la release \`gs9560\`:

- Origen: \`https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/tag/gs9560\`
- SHA-512: fijado en \`SOURCES.json\` y verificado en cada descarga.
- Licencia: AGPL-3.0-only (ver \`LICENSES/AGPL-3.0.txt\`).

## FFmpeg (ffmpeg-core.wasm)

## Configuración de compilación

La línea \`configuration:\` completa está en \`CONFIGURATION.txt\`. Se extrae del
propio binario, no de la documentación:

\`\`\`
${configuration}
\`\`\`

## Fuentes incluidas (\`source/\`)

| Componente | Versión | Licencia |
| --- | --- | --- |
| FFmpeg | n5.1.4 | LGPL-2.1-or-later / GPL-2.0-or-later (build GPL) |
| x264 | rama \`4-cores\` (fork ffmpegwasm/x264) | GPL-2.0-or-later |
| x265 | tag \`3.4\` (fork ffmpegwasm/x265) | GPL-2.0-or-later |
| ffmpeg.wasm | tag \`v0.12.10\` (commit \`c3a763857c5e615ae8674715ad5e4f63ff469e9d\`) | MIT (wrapper) |

Los cuatro tarball son los archivos tal cual los descarga GitHub para esas
referencias exactas. El de ffmpeg.wasm contiene el \`Dockerfile\` y el directorio
\`build/\` con los scripts de compilación de cada librería.

## Librerías incluidas en el binario

x264, x265, libvpx, libmp3lame, libogg, libtheora, libopus, libvorbis, zlib,
libwebp, freetype2, fribidi, harfbuzz, libass y zimg. Sus versiones exactas
están fijadas en el \`Dockerfile\` del tag \`v0.12.10\` y recogidas en
\`LICENSES/SOURCES.json\`.

## Cómo reconstruir el binario

\`\`\`bash
git clone https://github.com/ffmpegwasm/ffmpeg.wasm.git
cd ffmpeg.wasm
git checkout v0.12.10
docker build -t ffmpeg-wasm .
\`\`\`

El resultado (\`ffmpeg-core.js\` y \`ffmpeg-core.wasm\`) se copia a
\`public/assets/wasm/\`. El proceso se automatiza en
\`scripts/sync-media-assets.mjs\`.

## Verificación de la integridad

Cada entrada de \`LICENSES/SOURCES.json\` incluye el SHA-256 del fichero
correspondiente. Para comprobar la integridad, calcula el hash de cada fichero
y compáralo con el del manifiesto.

## Licencia y marcas

FFmpeg es una marca de Fabrice Bellard. Esta distribución no está afiliada a
los titulares de las marcas mencionadas. Los textos completos de las licencias
aplicables están en \`LICENSES/\`.
`;

writeFileSync(join(STAGING, 'BUILD.md'), buildMd, 'utf8');
described.set('BUILD.md', {
  id: 'build',
  version: RELEASE_TAG,
  license: '—',
  file: 'BUILD.md',
  url: '—',
  bytes: Buffer.byteLength(buildMd),
  sha256: sha256(buildMd),
});

/* Manifiesto final con todos los ficheros del staging. */
const files = [];
for (const absolute of walk(STAGING)) {
  const rel = relative(STAGING, absolute).replace(/\\/g, '/');
  if (rel === 'SOURCES.json') continue;
  const buffer = readFileSync(absolute);
  files.push({
    file: rel,
    bytes: buffer.length,
    sha256: sha256(buffer),
    ...(described.get(rel) ?? {}),
  });
}

const manifest = {
  release: RELEASE_TAG,
  subject:
    'Código fuente correspondiente de ffmpeg-core.wasm (FFmpeg 5.1.4, build GPL) y gs.wasm (Ghostscript 9.56.0)',
  binary: {
    file: 'public/assets/wasm/ffmpeg-core.wasm',
    version: '@ffmpeg/core 0.12.10',
    bytes: wasm.length,
    sha256: sha256(wasm),
    license: 'GPL-2.0-or-later',
    modified: false,
  },
  binaries: [
    {
      file: 'public/assets/wasm/ffmpeg-core.wasm',
      version: '@ffmpeg/core 0.12.10',
      bytes: wasm.length,
      sha256: sha256(wasm),
      license: 'GPL-2.0-or-later',
      modified: false,
    },
    {
      file: 'public/assets/gs/gs.wasm',
      version: '@jspawn/ghostscript-wasm 0.0.2 (Ghostscript 9.56.0)',
      bytes: gsWasm.length,
      sha256: sha256(gsWasm),
      license: 'AGPL-3.0-only',
      modified: false,
    },
  ],
  configuration,
  files: files.sort((a, b) => a.file.localeCompare(b.file)),
};

writeFileSync(
  join(STAGING, 'SOURCES.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

/* Verificación: releer el manifiesto y comprobar cada hash. */
const check = JSON.parse(readFileSync(join(STAGING, 'SOURCES.json'), 'utf8'));
let bad = 0;
for (const entry of check.files) {
  const buffer = readFileSync(join(STAGING, entry.file));
  if (sha256(buffer) !== entry.sha256 || buffer.length !== entry.bytes) {
    bad += 1;
    console.error(`  ✗ ${entry.file}`);
  }
}

if (bad > 0) {
  console.error(`✗ ${bad} fichero(s) no coinciden con su hash.`);
  process.exit(1);
}

/* Copia versionada del manifiesto (sin los tarball pesados). */
const versioned = join(ROOT, 'release', 'corresponding-source');
mkdirSync(versioned, { recursive: true });
writeFileSync(join(versioned, 'BUILD.md'), buildMd, 'utf8');
writeFileSync(join(versioned, 'CONFIGURATION.txt'), `${configuration}\n`, 'utf8');
writeFileSync(
  join(versioned, 'SOURCES.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(
  `✓ Release ${RELEASE_TAG} preparado en ${STAGING}: ${check.files.length} ficheros, ` +
    'hashes verificados.',
);
console.log('  Súbelo con: gh release create ' + RELEASE_TAG + ' --title "…" … (ver release/corresponding-source/README.md)');
