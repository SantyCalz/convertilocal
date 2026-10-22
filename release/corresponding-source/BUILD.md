# Código fuente correspondiente — ffmpeg-core.wasm y gs.wasm

Este directorio acompaña a los binarios `ffmpeg-core.wasm` y `gs.wasm` que
sirve ConvertiLocal. Cumple la GPL-2.0-or-later y la AGPL-3.0-only: los
binarios no han sido modificados, y aquí está el código fuente exacto con el
que se compilaron, junto con los scripts de compilación y los hashes de
verificación.

## Binarios distribuidos

| Campo | ffmpeg-core.wasm | gs.wasm |
| --- | --- | --- |
| Fichero | `public/assets/wasm/ffmpeg-core.wasm` | `public/assets/gs/gs.wasm` |
| Paquete | `@ffmpeg/core@0.12.10` | `@jspawn/ghostscript-wasm@0.0.2` |
| Versión upstream | FFmpeg n5.1.4 | Ghostscript 9.56.0 |
| Compilador | Emscripten 3.1.40 | Emscripten (build del paquete) |
| Licencia | GPL-2.0-or-later (build **GPL**) | AGPL-3.0-only |
| Modificado | **No** — se copia sin cambios desde el paquete npm | **No** — se copia sin cambios desde el paquete npm |

El hash SHA-256 de cada binario está en `SOURCES.json` (`binaries`) y en
`public/licencias/ffmpeg-fuente.txt`.

## Ghostscript (gs.wasm)

El binario `gs.wasm` procede de `@jspawn/ghostscript-wasm@0.0.2`, que
empaqueta Ghostscript 9.56.0 compilado con Emscripten. El código fuente
correspondiente es el tarball oficial `ghostscript-9.56.0.tar.xz` publicado
por Artifex en la release `gs9560`:

- Origen: `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/tag/gs9560`
- SHA-512: fijado en `SOURCES.json` y verificado en cada descarga.
- Licencia: AGPL-3.0-only (ver `LICENSES/AGPL-3.0.txt`).

## FFmpeg (ffmpeg-core.wasm)

## Configuración de compilación

La línea `configuration:` completa está en `CONFIGURATION.txt`. Se extrae del
propio binario, no de la documentación:

```
configuration: --target-os=none --arch=x86_32 --enable-cross-compile --disable-asm --disable-stripping --disable-programs --disable-doc --disable-debug --disable-runtime-cpudetect --disable-autodetect --nm=emnm --ar=emar --ranlib=emranlib --cc=emcc --cxx=em++ --objcc=emcc --dep-cc=emcc --extra-cflags='-I/opt/include -O3 -msimd128' --extra-cxxflags='-I/opt/include -O3 -msimd128' --disable-pthreads --disable-w32threads --disable-os2threads --enable-gpl --enable-libx264 --enable-libx265 --enable-libvpx --enable-libmp3lame --enable-libtheora --enable-libvorbis --enable-libopus --enable-zlib --enable-libwebp --enable-libfreetype --enable-libfribidi --enable-libass --enable-libzimg
```

## Fuentes incluidas (`source/`)

| Componente | Versión | Licencia |
| --- | --- | --- |
| FFmpeg | n5.1.4 | LGPL-2.1-or-later / GPL-2.0-or-later (build GPL) |
| x264 | rama `4-cores` (fork ffmpegwasm/x264) | GPL-2.0-or-later |
| x265 | tag `3.4` (fork ffmpegwasm/x265) | GPL-2.0-or-later |
| ffmpeg.wasm | tag `v0.12.10` (commit `c3a763857c5e615ae8674715ad5e4f63ff469e9d`) | MIT (wrapper) |

Los cuatro tarball son los archivos tal cual los descarga GitHub para esas
referencias exactas. El de ffmpeg.wasm contiene el `Dockerfile` y el directorio
`build/` con los scripts de compilación de cada librería.

## Librerías incluidas en el binario

x264, x265, libvpx, libmp3lame, libogg, libtheora, libopus, libvorbis, zlib,
libwebp, freetype2, fribidi, harfbuzz, libass y zimg. Sus versiones exactas
están fijadas en el `Dockerfile` del tag `v0.12.10` y recogidas en
`LICENSES/SOURCES.json`.

## Cómo reconstruir el binario

```bash
git clone https://github.com/ffmpegwasm/ffmpeg.wasm.git
cd ffmpeg.wasm
git checkout v0.12.10
docker build -t ffmpeg-wasm .
```

El resultado (`ffmpeg-core.js` y `ffmpeg-core.wasm`) se copia a
`public/assets/wasm/`. El proceso se automatiza en
`scripts/sync-media-assets.mjs`.

## Verificación de la integridad

Cada entrada de `LICENSES/SOURCES.json` incluye el SHA-256 del fichero
correspondiente. Para comprobar la integridad, calcula el hash de cada fichero
y compáralo con el del manifiesto.

## Licencia y marcas

FFmpeg es una marca de Fabrice Bellard. Esta distribución no está afiliada a
los titulares de las marcas mencionadas. Los textos completos de las licencias
aplicables están en `LICENSES/`.
