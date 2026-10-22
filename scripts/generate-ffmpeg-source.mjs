/**
 * Genera el manifiesto del código fuente correspondiente de FFmpeg.
 *
 * El sitio distribuye `public/assets/wasm/ffmpeg-core.wasm`, una build GPL-2.0-or-later
 * de FFmpeg 5.1.4 compilada a WebAssembly. La GPL exige acompañar el programa del
 * código fuente correspondiente; este manifiesto dice exactamente cuál es y cómo
 * reconstruirlo.
 *
 * Los datos se leen del paquete instalado, de modo que el manifiesto no puede
 * desviarse del binario que realmente se sirve.
 *
 * Uso: node scripts/generate-ffmpeg-source.mjs [--check]
 */
/**
 * scripts/generate-ffmpeg-source.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');

const CORE_PACKAGE = join(ROOT, 'node_modules', '@ffmpeg', 'core', 'package.json');
const WASM = join(ROOT, 'public', 'assets', 'wasm', 'ffmpeg-core.wasm');
const TARGET = join(ROOT, 'public', 'licencias', 'ffmpeg-fuente.txt');

if (!existsSync(CORE_PACKAGE) || !existsSync(WASM)) {
  console.error(
    '✗ No se encontró @ffmpeg/core o public/assets/wasm/ffmpeg-core.wasm. Ejecuta "npm install" y "npm run sync:media".',
  );
  process.exit(1);
}

const core = JSON.parse(readFileSync(CORE_PACKAGE, 'utf8'));

/** Versiones fijadas en el Dockerfile de ffmpeg.wasm para el tag v0.12.10. */
const PINNED = {
  'FFmpeg': { version: 'n5.1.4', license: 'LGPL-2.1+ / GPL-2.0+ según build', url: 'https://github.com/FFmpeg/FFmpeg/tree/n5.1.4' },
  'x264': { version: 'rama 4-cores (fork ffmpegwasm/x264)', license: 'GPL-2.0-or-later', url: 'https://github.com/ffmpegwasm/x264' },
  'x265': { version: 'rama 3.4 (fork ffmpegwasm/x265)', license: 'GPL-2.0-or-later', url: 'https://github.com/ffmpegwasm/x265' },
  'libvpx': { version: 'v1.13.1', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/libvpx' },
  'libmp3lame': { version: 'master (fork ffmpegwasm/lame)', license: 'LGPL-2.0-or-later', url: 'https://github.com/ffmpegwasm/lame' },
  'libogg': { version: 'v1.3.4', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/Ogg' },
  'libtheora': { version: 'v1.1.1', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/theora' },
  'libopus': { version: 'v1.3.1', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/opus' },
  'libvorbis': { version: 'v1.3.3', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/vorbis' },
  'zlib': { version: 'v1.2.11', license: 'Zlib', url: 'https://github.com/ffmpegwasm/zlib' },
  'libwebp': { version: 'v1.3.2', license: 'BSD-3-Clause', url: 'https://github.com/ffmpegwasm/libwebp' },
  'freetype2': { version: 'VER-2-10-4', license: 'FTL (GPL-2.0+ con excepción de fuentes)', url: 'https://github.com/ffmpegwasm/freetype2' },
  'fribidi': { version: 'v1.0.9', license: 'LGPL-2.1-or-later', url: 'https://github.com/fribidi/fribidi' },
  'harfbuzz': { version: '5.2.0', license: 'MIT', url: 'https://github.com/harfbuzz/harfbuzz' },
  'libass': { version: '0.15.0', license: 'ISC', url: 'https://github.com/libass/libass' },
  'zimg': { version: 'release-3.0.5', license: 'Zlib', url: 'https://github.com/sekrit-twc/zimg' },
  'Emscripten': { version: '3.1.40', license: 'MIT', url: 'https://github.com/emscripten-core/emsdk' },
};

/** Extrae la línea `configuration:` del binario para documentar la variante. */
function readConfiguration() {
  const buffer = readFileSync(WASM);
  let current = '';
  let found = null;
  for (const byte of buffer) {
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
    } else {
      // La cadena va precedida del especificador de formato `%s`.
      const at = current.indexOf('configuration: --target-os=none');
      if (at !== -1) found = current.slice(at);
      current = '';
    }
  }
  return found;
}

const configuration = readConfiguration();
const sha256 = createHash('sha256').update(readFileSync(WASM)).digest('hex');
const isGpl = /--enable-gpl/.test(configuration ?? '');

/** Parte la configuración en líneas de 96 caracteres sin cortar palabras. */
function wrapConfiguration(value) {
  if (!value) return '  (no se pudo extraer del binario)';
  const words = value.split(' ');
  const lines = [];
  let line = '  ';
  for (const word of words) {
    if (line.length + word.length + 1 > 96) {
      lines.push(line);
      line = '  ';
    }
    line += (line.trim() ? ' ' : '') + word;
  }
  if (line.trim()) lines.push(line);
  return lines.join('\n');
}

/** Etiqueta del tag upstream que corresponde a la versión de @ffmpeg/core. */
const upstreamTag = `v${core.version}`;

const content = `CODIGO FUENTE CORRESPONDIENTE — FFmpeg.wasm
=============================================

Este sitio distribuye un binario de FFmpeg compilado a WebAssembly. La GPL
exige que se acompanie del codigo fuente correspondiente. Este manifiesto indica
exactamente cual es y como reconstruirlo.

BINARIO DISTRIBUIDO
-------------------
  Fichero      : public/assets/wasm/ffmpeg-core.wasm
  Version      : @ffmpeg/core ${core.version}
  SHA-256      : ${sha256}
  Licencia     : ${core.license ?? 'GPL-2.0-or-later'}
  Variante     : ${isGpl ? 'GPL (--enable-gpl --enable-libx264 --enable-libx265)' : 'LGPL'}
  Upstream     : ${core.repository?.url ?? 'https://github.com/ffmpegwasm/ffmpeg.wasm'}
  Version FFmpeg: 5.1.4
  Emulador     : Emscripten 3.1.40

El binario NO ha sido modificado por este proyecto: se copia tal cual desde el
paquete npm @ffmpeg/core ${core.version}. El hash SHA-256 permite verificarlo.

CONFIGURACION DE COMPILACION
-----------------------------
${wrapConfiguration(configuration)}

CODIGO FUENTE CORRESPONDIENTE
-----------------------------
1) FFmpeg n5.1.4, la version con la que se compilo el binario
   https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
   https://ffmpeg.org/releases/ffmpeg-5.1.4.tar.xz

2) ffmpeg.wasm ${upstreamTag}, con los scripts de compilacion, el Dockerfile y
   los forks parcheados de cada libreria
   https://github.com/ffmpegwasm/ffmpeg.wasm/tree/${upstreamTag}
   Directorio relevante: build/

3) Librerias de terceros compiladas dentro del binario
${Object.entries(PINNED)
  .map(
    ([name, info]) =>
      `   ${name.padEnd(12)} ${info.version.padEnd(38)} ${info.license.padEnd(42)} ${info.url}`,
  )
  .join('\n')}

PARA RECONSTRUIR EL BINARIO
----------------------------
  git clone https://github.com/ffmpegwasm/ffmpeg.wasm.git
  cd ffmpeg.wasm && git checkout ${upstreamTag}
  docker build -t ffmpeg-wasm .
  # El resultado se copia a public/assets/wasm/ffmpeg-core.{js,wasm}

LICENCIAS APLICABLES
---------------------
  GPL-2.0 (binario ffmpeg-core.wasm) : /licencias/gpl-2.0.txt
  LGPL-2.1                            : /licencias/lgpl-2.1.txt
  Apache-2.0, MIT, BSD-3-Clause, ISC   : /licencias/terceros.txt

FFmpeg es una marca de Fabrice Bellard. Esta distribucion no esta afiliada a
los titulares de las marcas citadas.

Este manifiesto lo genera scripts/generate-ffmpeg-source.mjs a partir del
paquete instalado y del binario servido, para que no pueda desviarse de la
realidad.
`;

mkdirSync(join(ROOT, 'public', 'licencias'), { recursive: true });

const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : null;

if (current === content) {
  console.log('  · public/licencias/ffmpeg-fuente.txt ya está al día');
} else if (CHECK_ONLY) {
  console.error('  ✗ public/licencias/ffmpeg-fuente.txt está desactualizado');
  process.exit(1);
} else {
  writeFileSync(TARGET, content, 'utf8');
  console.log('  ✓ public/licencias/ffmpeg-fuente.txt generado');
}

console.log(
  `✓ Manifiesto de fuente de FFmpeg: @ffmpeg/core ${core.version}, variante ${isGpl ? 'GPL' : 'LGPL'}.`,
);
