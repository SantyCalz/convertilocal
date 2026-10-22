# Release «corresponding-source» — código fuente de FFmpeg y Ghostscript

Este directorio contiene el manifiesto del release que acompaña a los binarios
`ffmpeg-core.wasm` y `gs.wasm` que sirve el sitio. La GPL-2.0-or-later y la
AGPL-3.0-only exigen acompañar los programas del código fuente correspondiente;
este directorio dice exactamente cuál es, con los hashes para verificarlo.

## Qué hay aquí

| Fichero | Contenido |
| --- | --- |
| `BUILD.md` | Cómo reconstruir los binarios exactos, qué librerías incluyen y cómo verificar la integridad. |
| `CONFIGURATION.txt` | La línea `configuration:` completa de FFmpeg, extraída del propio binario. |
| `SOURCES.json` | Manifiesto con el SHA-256 de cada fichero del release y el SHA-512 de las fuentes de Ghostscript. |

Los textos de licencia que acompañan al release están en `public/licencias/` y
se copian al staging al preparar el release.

## Release publicado

**`https://github.com/SantyCalz/convertilocal/releases/tag/corresponding-source-v1.1.0`**

Todos los assets se descargan sin autenticación:

| Asset | Tamaño | Hash (prefijo) |
| --- | ---: | --- |
| `ghostscript-9.56.0.tar.xz` | 58,90 MB | `42233045041bdfad…` (SHA-512) |
| `ffmpeg-n5.1.4.tar.gz` | 13,75 MB | `6ed8ba17d513955c…` (SHA-256) |
| `x265-3.4.tar.gz` | 1,46 MB | `abd37f4ab99570fc…` (SHA-256) |
| `ffmpegwasm-v0.12.10-build-scripts.tar.gz` | 1,06 MB | `3f1c3f94143d11e3…` (SHA-256) |
| `x264-4-cores.tar.gz` | 0,90 MB | `cc64a8972d47d835…` (SHA-256) |
| `BUILD.md`, `CONFIGURATION.txt`, `SOURCES.json` | 0,01 MB | — |
| `GPL-2.0.txt`, `GPL-3.0.txt`, `LGPL-2.1.txt`, `AGPL-3.0.txt`, `Apache-2.0.txt`, `MIT.txt`, `BSD-3-Clause.txt`, `ISC.txt` | 0,16 MB | — |

Los hashes completos están en `SOURCES.json`. Los 15 ficheros están verificados:
cada asset descargado sin autenticación coincide con el hash del manifiesto.

## Qué NO está aquí (y por qué)

Los tarball del código fuente pesan unos 76 MB en total y **no se versionan en
el repositorio**: se adjuntan como *assets* del GitHub Release, que es donde un
usuario que interactúa con el sitio puede descargarlos.

## Cómo regenerar el release

```bash
# 1. Preparar el staging (descarga las fuentes y genera el manifiesto)
node scripts/build-corresponding-source.mjs

# 2. Subirlo (o actualizar los assets de un release existente)
gh release create corresponding-source-v1.1.0 \
  --repo SantyCalz/convertilocal \
  --title "Corresponding Source for FFmpeg and Ghostscript" \
  --notes-file release/corresponding-source/BUILD.md \
  release-staging/*

# Para actualizar un release ya publicado:
gh release upload corresponding-source-v1.1.0 release-staging/SOURCES.json --clobber
```

El script deja el staging en `release-staging/` (fuera del repositorio) y verifica
los hashes antes de subir nada.

## Requisito previo de la AGPL §13

El release cubre la parte de GPL-2.0 (fuente de FFmpeg) y AGPL-3.0 (fuente de
Ghostscript). La obligación de la AGPL-3.0 es distinta: exige que **cualquier
persona** que interactúe con el sitio por red pueda obtener el código fuente del
proyecto. Para eso el repositorio tiene que ser público; `npm run deploy:check`
lo comprueba en cada despliegue.
