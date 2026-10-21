# Licencias de terceros

> Generado automáticamente por `scripts/generate-third-party.mjs` el 2026-10-21.
> No editar a mano: los cambios se pierden en el siguiente build.

Este documento lista las dependencias del proyecto y sus licencias. El proyecto completo se
publica bajo la **GNU Affero General Public License v3.0 únicamente** (`AGPL-3.0-only`); el
texto canónico está en [`LICENSE`](LICENSE) y la auditoría completa en
[`docs/LICENSE_AUDIT.md`](docs/LICENSE_AUDIT.md).

## Resumen

- Paquetes instalados en `node_modules`: **757**.
- Dependencias directas de producción: **22**.
- Dependencias de desarrollo: **12**.
- Componentes con copyleft o copyleft limitado: **4**.

- MIT: 25
- Apache-2.0: 5
- GPL-2.0-or-later: 1
- AGPL-3.0-only: 1
- (MPL-2.0 OR Apache-2.0): 1
- GPL-3.0-or-later: 1

## Dependencias con copyleft

- `@ffmpeg/core` 0.12.10 — GPL-2.0-or-later
- `@imgly/background-removal` 1.7.0 — AGPL-3.0-only
- `dompurify` 3.4.17 — (MPL-2.0 OR Apache-2.0)
- `ffmpeg-static` 5.3.0 — GPL-3.0-or-later

El detalle de las obligaciones que generan (copia de la licencia, código fuente correspondiente,
aviso de red de la AGPL §13) está en [`/licencias`](https://convertilocal.com/licencias).

## Inventario

| Componente | Versión | Licencia | ¿Se distribuye? | Origen |
| --- | --- | --- | --- | --- |
| `@astrojs/check` | 0.9.11 | MIT | No | git+https://github.com/withastro/astro.git |
| `@astrojs/sitemap` | 3.7.4 | MIT | No | git+https://github.com/withastro/astro.git |
| `@astrojs/tailwind` | 6.0.2 | MIT | No | git+https://github.com/withastro/astro.git |
| `@eslint/js` | 9.39.5 | MIT | No | https://github.com/eslint/eslint.git |
| `@ffmpeg/core` | 0.12.10 | GPL-2.0-or-later | Sí | git+https://github.com/ffmpegwasm/ffmpeg.wasm.git |
| `@ffmpeg/ffmpeg` | 0.12.15 | MIT | Sí | git+https://github.com/ffmpegwasm/ffmpeg.wasm.git |
| `@ffmpeg/util` | 0.12.2 | MIT | Sí | git+https://github.com/ffmpegwasm/ffmpeg.wasm.git |
| `@imgly/background-removal` | 1.7.0 | AGPL-3.0-only | Sí | git+https://github.com/imgly/background-removal-js.git |
| `@jsquash/avif` | 2.1.1 | Apache-2.0 | Sí | jamsinclair/jSquash |
| `@playwright/test` | 1.64.1 | Apache-2.0 | No | git+https://github.com/microsoft/playwright.git |
| `astro` | 5.18.2 | MIT | No | git+https://github.com/withastro/astro.git |
| `dompurify` | 3.4.17 | (MPL-2.0 OR Apache-2.0) | Sí | git://github.com/cure53/DOMPurify.git |
| `eslint` | 9.39.5 | MIT | No | eslint/eslint |
| `eslint-plugin-astro` | 1.7.0 | MIT | No | git+https://github.com/ota-meshi/eslint-plugin-astro.git |
| `fflate` | 0.8.3 | MIT | Sí | https://github.com/101arrowz/fflate |
| `ffmpeg-static` | 5.3.0 | GPL-3.0-or-later | No | https://github.com/eugeneware/ffmpeg-static |
| `globals` | 14.0.0 | MIT | No | sindresorhus/globals |
| `globals` | 16.5.0 | MIT | No | sindresorhus/globals |
| `heic2any` | 0.0.4 | MIT | Sí | git+https://github.com/alexcorvi/heic2any.git |
| `js-yaml` | 4.3.2 | MIT | Sí | nodeca/js-yaml |
| `js-yaml` | 4.3.2 | MIT | Sí | nodeca/js-yaml |
| `js-yaml` | 4.3.2 | MIT | Sí | nodeca/js-yaml |
| `js-yaml` | 5.5.0 | MIT | Sí | nodeca/js-yaml |
| `marked` | 18.1.1 | MIT | Sí | git+https://github.com/markedjs/marked.git |
| `onnxruntime-web` | 1.21.0 | MIT | Sí | https://github.com/Microsoft/onnxruntime.git |
| `pdf-lib` | 1.17.1 | MIT | Sí | git+https://github.com/Hopding/pdf-lib.git |
| `pdfjs-dist` | 6.4.299 | Apache-2.0 | Sí | git+https://github.com/mozilla/pdf.js.git |
| `prettier` | 3.9.10 | MIT | No | prettier/prettier |
| `prettier-plugin-astro` | 1.1.1 | MIT | No | git+https://github.com/withastro/prettier-plugin-astro.git |
| `tailwindcss` | 3.4.19 | MIT | No | https://github.com/tailwindlabs/tailwindcss.git#v3 |
| `turndown` | 7.2.4 | MIT | Sí | https://github.com/mixmark-io/turndown.git |
| `typescript` | 5.9.3 | Apache-2.0 | No | https://github.com/microsoft/TypeScript.git |
| `typescript-eslint` | 8.72.0 | MIT | No | https://github.com/typescript-eslint/typescript-eslint.git |
| `xlsx` | 0.18.5 | Apache-2.0 | Sí | git://github.com/SheetJS/sheetjs.git |

## Textos de licencia

Se sirven en `/licencias/` y en la raíz del repositorio:

| Licencia | Fichero |
| --- | --- |
| AGPL-3.0-only | `licencias/agpl-3.0.txt` |
| GPL-2.0-only | `licencias/gpl-2.0.txt` |
| GPL-3.0-only | `licencias/gpl-3.0.txt` |
| LGPL-2.1-only | `licencias/lgpl-2.1.txt` |
| Apache-2.0 | `licencias/apache-2.0.txt` |
| MIT | `licencias/mit.txt` |
| BSD-3-Clause | `licencias/bsd-3-clause.txt` |
| ISC | `licencias/isc.txt` |

## Aviso de marcas

«ConvertiLocal» y el diseño del sitio son marcas de sus titulares y no están cubiertos por
ninguna de las licencias anteriores. «FFmpeg» es una marca de Fabrice Bellard. Los nombres de
los proyectos citados pertenecen a sus respectivos autores y se mencionan con fines meramente
informativos.
