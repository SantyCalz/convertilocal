# Release «corresponding-source» — código fuente de FFmpeg

Este directorio contiene el manifiesto del release que acompaña al binario
`ffmpeg-core.wasm` que sirve el sitio. La GPL-2.0-or-later exige acompañar el
programa del código fuente correspondiente; este directorio dice exactamente
cuál es, con los hashes para verificarlo.

## Qué hay aquí

| Fichero | Contenido |
| --- | --- |
| `BUILD.md` | Cómo reconstruir el binario exacto, qué librerías incluye y cómo verificar la integridad. |
| `CONFIGURATION.txt` | La línea `configuration:` completa, extraída del propio binario. |
| `LICENSES/SOURCES.json` | Manifiesto con el SHA-256 de cada fichero del release. |

Los textos de licencia que acompañan al release están en
`public/licencias/` y se copian a `LICENSES/` al preparar el release.

## Qué NO está aquí (y por qué)

Los tarball del código fuente pesan 18 MB en total y **no se versionan en el
repositorio**: se adjuntan como *assets* del GitHub Release, que es donde un
usuario que interactúa con el sitio puede descargarlos.

| Fichero del release | Tamaño | SHA-256 (prefijo) |
| --- | ---: | --- |
| `source/ffmpeg-n5.1.4.tar.gz` | 13,75 MB | `6ed8ba17d513955c…` |
| `source/x265-3.4.tar.gz` | 1,46 MB | `abd37f4ab99570fc…` |
| `source/ffmpegwasm-v0.12.10-build-scripts.tar.gz` | 1,06 MB | `3f1c3f94143d11e3…` |
| `source/x264-4-cores.tar.gz` | 0,90 MB | `cc64a8972d47d835…` |

Los hashes completos están en `LICENSES/SOURCES.json`.

## Cómo subir el release

```bash
# 1. Preparar el staging (descarga las fuentes y genera el manifiesto)
node scripts/build-corresponding-source.mjs

# 2. Crear el release y adjuntar los ficheros
gh release create corresponding-source-v1.0.0 \
  --repo SantyCalz/convertilocal \
  --title "corresponding-source-v1.0.0 — ffmpeg-core.wasm (FFmpeg 5.1.4, GPL)" \
  --notes-file release/corresponding-source/BUILD.md \
  release/corresponding-source/BUILD.md \
  release/corresponding-source/CONFIGURATION.txt \
  release/corresponding-source/LICENSES/SOURCES.json \
  "$STAGING/source/ffmpeg-n5.1.4.tar.gz" \
  "$STAGING/source/x264-4-cores.tar.gz" \
  "$STAGING/source/x265-3.4.tar.gz" \
  "$STAGING/source/ffmpegwasm-v0.12.10-build-scripts.tar.gz" \
  "$STAGING/LICENSES/GPL-2.0.txt" \
  "$STAGING/LICENSES/GPL-3.0.txt" \
  "$STAGING/LICENSES/LGPL-2.1.txt" \
  "$STAGING/LICENSES/AGPL-3.0.txt" \
  "$STAGING/LICENSES/Apache-2.0.txt" \
  "$STAGING/LICENSES/MIT.txt" \
  "$STAGING/LICENSES/BSD-3-Clause.txt" \
  "$STAGING/LICENSES/ISC.txt"
```

El script `scripts/build-corresponding-source.mjs` deja el staging en
`release-staging/` (fuera del repositorio) y verifica los hashes antes de
subir nada.

## Requisito previo de la AGPL §13

El release anterior cubre la parte de GPL-2.0 (fuente del binario). La
obligación de la AGPL-3.0 es distinta: exige que **cualquier persona** que
interactúe con el sitio por red pueda obtener el código fuente del proyecto.
Eso exige que el **repositorio sea público**. Si `SantyCalz/convertilocal` sigue
siendo privado, el enlace «Código fuente» del pie de página lleva a un muro de
inicio de sesión y la obligación no queda satisfecha.
