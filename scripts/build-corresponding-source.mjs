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
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const argStaging = process.argv.find((arg) => arg.startsWith('--staging='))?.split('=')[1];
const STAGING = argStaging
  ? join(ROOT, argStaging)
  : join(ROOT, 'release-staging');

const RELEASE_VERSION = '1.0.0';
const RELEASE_TAG = `corresponding-source-v${RELEASE_VERSION}`;

/** Fuentes exactas de las que se compone el binario distribuido. */
const SOURCES = [
  {
    id: 'ffmpeg',
    version: 'n5.1.4',
    license: 'LGPL-2.1-or-later / GPL-2.0-or-later (build con --enable-gpl)',
    file: 'source/ffmpeg-n5.1.4.tar.gz',
    url: 'https://github.com/FFmpeg/FFmpeg/archive/refs/tags/n5.1.4.tar.gz',
  },
  {
    id: 'x264',
    version: 'rama 4-cores (fork ffmpegwasm/x264)',
    license: 'GPL-2.0-or-later',
    file: 'source/x264-4-cores.tar.gz',
    url: 'https://github.com/ffmpegwasm/x264/archive/refs/heads/4-cores.tar.gz',
  },
  {
    id: 'x265',
    version: 'tag 3.4 (fork ffmpegwasm/x265)',
    license: 'GPL-2.0-or-later',
    file: 'source/x265-3.4.tar.gz',
    url: 'https://github.com/ffmpegwasm/x265/archive/refs/tags/3.4.tar.gz',
  },
  {
    id: 'ffmpeg-wasm-build-scripts',
    version: 'v0.12.10 (commit c3a763857c5e615ae8674715ad5e4f63ff469e9d)',
    license: 'MIT (wrapper) — compila FFmpeg y sus forks bajo GPL/LGPL',
    file: 'source/ffmpegwasm-v0.12.10-build-scripts.tar.gz',
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

mkdirSync(join(STAGING, 'source'), { recursive: true });
mkdirSync(join(STAGING, 'LICENSES'), { recursive: true });

const described = new Map();

for (const source of SOURCES) {
  const target = join(STAGING, source.file);
  process.stdout.write(`Descargando ${source.id}… `);
  try {
    const buffer = await download(source.url);
    writeFileSync(target, buffer);
    described.set(source.file, { ...source, bytes: buffer.length, sha256: sha256(buffer) });
    console.log(`${(buffer.length / 1048576).toFixed(1)} MB`);
  } catch (error) {
    console.log(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

for (const [name, origin] of LICENSES) {
  if (!existsSync(join(ROOT, origin))) continue;
  const buffer = readFileSync(join(ROOT, origin));
  writeFileSync(join(STAGING, 'LICENSES', name), buffer);
  described.set(`LICENSES/${name}`, {
    id: `license/${name}`,
    version: name,
    license: 'texto oficial de la licencia',
    file: `LICENSES/${name}`,
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
const buildMd = `# Código fuente correspondiente — ffmpeg-core.wasm

Este directorio acompaña al binario \`ffmpeg-core.wasm\` que sirve ConvertiLocal.
Cumple la GPL-2.0-or-later: el binario no ha sido modificado, y aquí está el
código fuente exacto con el que se compiló, junto con los scripts de
compilación y los hashes de verificación.

## Binario distribuido

| Campo | Valor |
| --- | --- |
| Fichero | \`public/assets/wasm/ffmpeg-core.wasm\` |
| Paquete | \`@ffmpeg/core@0.12.10\` |
| Versión de FFmpeg | n5.1.4 |
| Compilador | Emscripten 3.1.40 (\`emscripten/emsdk:3.1.40\`) |
| Licencia | GPL-2.0-or-later (build **GPL**) |
| Modificado | **No** — se copia sin cambios desde el paquete npm |

El hash SHA-256 del binario está en \`LICENSES/SOURCES.json\` (\`binary.sha256\`)
y en \`public/licencias/ffmpeg-fuente.txt\`.

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
  if (rel === 'LICENSES/SOURCES.json') continue;
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
  subject: 'Código fuente correspondiente de ffmpeg-core.wasm (FFmpeg 5.1.4, build GPL)',
  binary: {
    file: 'public/assets/wasm/ffmpeg-core.wasm',
    version: '@ffmpeg/core 0.12.10',
    bytes: wasm.length,
    sha256: sha256(wasm),
    license: 'GPL-2.0-or-later',
    modified: false,
  },
  configuration,
  files: files.sort((a, b) => a.file.localeCompare(b.file)),
};

writeFileSync(
  join(STAGING, 'LICENSES', 'SOURCES.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

/* Verificación: releer el manifiesto y comprobar cada hash. */
const check = JSON.parse(readFileSync(join(STAGING, 'LICENSES', 'SOURCES.json'), 'utf8'));
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
mkdirSync(join(versioned, 'LICENSES'), { recursive: true });
writeFileSync(join(versioned, 'BUILD.md'), buildMd, 'utf8');
writeFileSync(join(versioned, 'CONFIGURATION.txt'), `${configuration}\n`, 'utf8');
writeFileSync(
  join(versioned, 'LICENSES', 'SOURCES.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(
  `✓ Release ${RELEASE_TAG} preparado en ${STAGING}: ${check.files.length} ficheros, ` +
    'hashes verificados.',
);
console.log('  Súbelo con: gh release create ' + RELEASE_TAG + ' --title "…" … (ver release/corresponding-source/README.md)');
