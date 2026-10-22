# Auditoría de licencias — ConvertiLocal

> **Alcance:** dependencias de producción, binarios y modelos servidos, y obligaciones
> copyleft derivadas. Este documento es un inventario técnico y una guía de cumplimiento;
> no constituye asesoría legal.
>
> **Fecha de la auditoría:** 2026-10-21
> **Commit auditado:** `f283e95`
> **Herramientas:** `license-checker-rseidelsohn` (SPDX vía `package.json`), lectura directa de
> los `LICENSE`/`COPYING` de cada paquete, extracción de cadenas del binario WASM y captura de
> `ffmpeg.exec(['-version'])` en navegador real.

---

## 1. Resumen ejecutivo

| Componente | Licencia detectada | ¿Distribuido al usuario? | Obligación principal |
| --- | --- | --- | --- |
| `@imgly/background-removal@1.7.0` | **AGPL-3.0** (solo) | Sí (bundle JS + modelos) | Licencia AGPL completa + **fuente correspondiente** (§13, red) |
| `@ffmpeg/core@0.12.10` | **GPL-2.0-or-later** (`VARIANTE_GPL`) | Sí (WASM de 30,74 MB) | Copia de la GPL-2.0 + disponibilidad del código fuente |
| `pdfjs-dist@6.4.299` | Apache-2.0 | Sí (worker + WASM) | Atribución + cláusula de patentes |
| `xlsx@0.18.5` | Apache-2.0 | Sí (bundle JS) | Atribución |
| `@jsquash/avif@2.1.1` | Apache-2.0 | Sí (WASM AV1) | Atribución |
| `dompurify@3.4.17` | MPL-2.0 **o** Apache-2.0 | Sí (bundle JS) | Se electa Apache-2.0 |
| `heic2any@0.0.4` | MIT | Sí (bundle JS) | Atribución |
| `onnxruntime-web@1.21.0` | MIT | Sí (WASM ORT) | Atribución |
| Pesos IS-Net | Apache-2.0 (ver §7.1) | Sí (126 MB de modelos) | Atribución |
| Resto (398 paquetes) | MIT / BSD / ISC / Apache-2.0 | Mixto | Atribución |

**Veredicto:** el proyecto es compatible con **AGPL-3.0**, y el componente GPL-2.0-or-later
(FFmpeg) es compatible con AGPL-3.0 por su cláusula «or later». No se ha detectado ningún
componente `nonfree`, ni ninguna licencia copyleft incompatible.

**SPDX del proyecto: `AGPL-3.0-only`.** Justificación en §6.

**No hay bloqueos.** No se cumple ninguna condición de detención de la Fase 0 (no hay
`--enable-nonfree`, no hay licencias `UNKNOWN` sin resolver).

---

## 2. Inventario de licencias de dependencias

`npx license-checker-rseidelsohn --production --json` → **408 paquetes** instalados en producción.

| Licencia | Paquetes |
| --- | ---: |
| MIT | 330 |
| Apache-2.0 | 22 |
| ISC | 17 |
| BSD-3-Clause | 13 |
| BSD-2-Clause | 10 |
| BlueOak-1.0.0 | 2 |
| CC0-1.0 | 2 |
| Python-2.0 / PSF-2.0 / CC-BY-4.0 / 0BSD / (MIT AND Zlib) / (MIT OR CC0-1.0) / MIT* | 7 |
| **GPL-2.0-or-later** | 1 (`@ffmpeg/core`) |
| **Custom: LICENSE.md** → AGPL-3.0 | 1 (`@imgly/background-removal`) |
| (MPL-2.0 OR Apache-2.0) | 1 (`dompurify`) |
| Apache-2.0 AND LGPL-3.0-or-later | 1 (`@img/sharp-win32-x64`, solo build) |
| UNLICENSED | 1 (`convertilocal`, el propio proyecto — se corrige en Fase 1) |

### Dependencias directas

| Paquete | Versión | Licencia | Distribuida |
| --- | --- | --- | --- |
| `@astrojs/sitemap` | 5.3.7 → 3.7.4 | MIT | No (build) |
| `@astrojs/tailwind` | 6.0.2 | MIT | No (build) |
| `@ffmpeg/core` | 0.12.10 | **GPL-2.0-or-later** | **Sí** |
| `@ffmpeg/ffmpeg` | 0.12.15 | MIT | Sí |
| `@ffmpeg/util` | 0.12.2 | MIT | Sí |
| `@imgly/background-removal` | 1.7.0 | **AGPL-3.0** | **Sí** |
| `@jsquash/avif` | 2.1.1 | Apache-2.0 | Sí |
| `astro` | 5.18.2 | MIT | No (build) |
| `dompurify` | 3.4.17 | MPL-2.0 OR Apache-2.0 | Sí |
| `fflate` | 0.8.3 | MIT | Sí |
| `heic2any` | 0.0.4 | MIT | Sí |
| `js-yaml` | 5.5.0 | MIT | Sí |
| `marked` | 18.1.1 | MIT | Sí |
| `onnxruntime-web` | 1.21.0 | MIT | Sí |
| `pdf-lib` | 1.17.1 | MIT | Sí |
| `pdfjs-dist` | 6.4.299 | Apache-2.0 | Sí |
| `tailwindcss` | 3.4.19 | MIT | No (build) |
| `turndown` | 7.2.4 | MIT | Sí |
| `xlsx` | 0.18.5 | Apache-2.0 | Sí |

### Dependencias solo de build (no se distribuyen)

| Paquete | Licencia | Motivo |
| --- | --- | --- |
| `sharp` y `@img/sharp-*` | Apache-2.0 AND LGPL-3.0-or-later | `optionalDependency` de Astro. El proyecto **no** usa `astro:assets` (0 ficheros), por lo que el binario nunca se ejecuta ni se distribuye. La LGPL-3.0 no genera obligaciones de distribución. |
| `pdfjs-dist` (parcial) | Apache-2.0 | Su worker y WASM **sí** se distribuyen (ver §4). |
| `ffmpeg-static` | MIT (wrapper) / GPL-3.0 (binario local) | Solo `devDependency`, usada por `scripts/generate-test-fixtures.mjs`. No se distribuye. |

---

## 3. Auditoría de binarios, modelos y datos servidos

Todos los ficheros de `public/` que ejecutan o cargan código en el navegador:

| Fichero | Tamaño | SHA-256 |
| --- | ---: | --- |
| `public/assets/wasm/ffmpeg-core.wasm` | 30,74 MB | `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7` |
| `public/assets/wasm/ffmpeg-core.js` | 0,11 MB | `67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3` |
| `public/scripts/pdf.worker.min.mjs` | 1,26 MB | `145d2dd3ab0c86151011dba95acfa2d5336e2accd59388ea43dbee0efddaaec6` |
| `public/assets/imgly/resources.json` | 0,02 MB | `4e2a359d0436f1e55cb0e4e29a1c943f5d86d639ba4f4b5ea874a699b1f742d3` |
| `public/assets/imgly/<hash>` (45 fragmentos) | 159,68 MB | El nombre del fichero **es** el SHA-256 del fragmento. Árbol completo: `1d9cc29c206a367fc61635ba09546d836d1d6402e8fa98f46167edd39ea49556` |
| `public/assets/pdf/**` (202 ficheros) | 3,37 MB | PDF.js 6.4.299 (`wasm/`, `cmaps/`, `standard_fonts/`) |

**Origen y licencia de cada grupo:**

| Grupo | Origen | Versión | Licencia |
| --- | --- | --- | --- |
| `assets/wasm/ffmpeg-core.*` | `@ffmpeg/core` (npm) | 0.12.10 | **GPL-2.0-or-later** (`VARIANTE_GPL`, ver §5) |
| `assets/imgly/*` (runtime ONNX) | `onnxruntime-web` vía `staticimgly.com` | 1.21.0 | MIT |
| `assets/imgly/*` (modelos IS-Net) | `xuebinqin/DIS` vía `staticimgly.com` | isnet / isnet_fp16 / isnet_quint8 | Apache-2.0 (ver §7.1) |
| `assets/pdf/**` | `pdfjs-dist` (npm) | 6.4.299 | Apache-2.0 |
| `scripts/pdf.worker.min.mjs` | `pdfjs-dist` (npm) | 6.4.299 | Apache-2.0 |

**No existen** ficheros `.traineddata` (Tesseract/OCR no forma parte de este proyecto; la
dependencia `tesseract.js` mencionada en el encargo no está instalada ni se usa), ni modelos
`.onnx` sueltos (el runtime de ONNX carga los pesos IS-Net en formato plano servido como
fragmentos), ni ninguna otra carga de datos binarios.

---

## 4. Verificación de `@imgly/background-removal`: sin CDN en runtime

**Requisito:** confirmar que no se hacen peticiones a `staticimgly.com` ni a CDNs externos.

### 4.1 Análisis estático

`staticimgly.com` aparece **únicamente** en `scripts/sync-bg-assets.mjs`, que es un script de
build (descarga los assets una vez). En tiempo de ejecución, el procesador sobrescribe
`publicPath` con la ruta local:

```ts
// src/scripts/processors/image/remove-background.ts
publicPath: new URL('/assets/imgly/', window.location.origin).href,
```

### 4.2 Verificación en runtime (navegador real)

Ejecutando el flujo completo de «Eliminar fondo» con Playwright y registrando **todas** las
peticiones de red:

```
localhost:4321                       31 peticiones   ← documento, JS, CSS, WASM, 45 fragmentos del modelo
blob:http://localhost:4321/…          4 peticiones   ← URLs de objeto locales
pagead2.googlesyndication.com         4 peticiones   ← AdSense (autorizado)
googleads.g.doubleclick.net           2 peticiones   ← serving de anuncios (autorizado)
ep1.adtrafficquality.google           2 peticiones   ← medición (autorizado)
ep2.adtrafficquality.google           3 peticiones   ← medición (autorizado)
www.google.com                        1 petición     ← reCAPTCHA de AdSense (autorizado)
```

**`staticimgly.com`: 0 peticiones.** ✅ Los 126 MB de pesos del modelo y el runtime de ONNX se
sirven íntegramente desde el propio dominio.

### 4.3 Constantes de terceros presentes en los bundles

No son peticiones, pero aparecen como valores por defecto de las librerías:

| Constante | Dónde | Uso real |
| --- | --- | --- |
| `https://staticimgly.com/@imgly/background-removal-data/${PACKAGE_VERSION}/dist/` | `dist/_astro/index.*.js` | Valor por defecto del esquema de configuración de `@imgly`. **Sustituido** por `/assets/imgly/` en cada llamada. |
| `https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd/ffmpeg-core.js` | `dist/_astro/worker-*.js` | `CORE_URL` por defecto de `@ffmpeg/ffmpeg`. **Sustituido** por `/assets/wasm/ffmpeg-core.js`. |

Se documentan aquí para que el control de calidad de la Fase 5 pueda distinguir una constante
inerte de una petición real.

---

## 5. Variante del binario de FFmpeg (análisis crítico)

### 5.1 Extracción de cadenas del binario servido

`ffmpeg-core.wasm` es un módulo WASM; su cadena `configuration:` es la misma que imprime
`-version`. Extracción de cadenas ASCII (longitud ≥ 8) sobre **el fichero servido en
`public/`**:

```
configuration: --target-os=none --arch=x86_32 --enable-cross-compile --disable-asm
--disable-stripping --disable-programs --disable-doc --disable-debug
--disable-runtime-cpudetect --disable-autodetect --nm=emnm --ar=emar --ranlib=emranlib
--cc=emcc --cxx=em++ --objcc=emcc --dep-cc=emcc --extra-cflags='-I/opt/include -O3 -msimd128'
--extra-cxxflags='-I/opt/include -O3 -msimd128' --disable-pthreads --disable-w32threads
--disable-os2threads --enable-gpl --enable-libx264 --enable-libx265 --enable-libvpx
--enable-libmp3lame --enable-libtheora --enable-libvorbis --enable-libopus --enable-zlib
--enable-libwebp --enable-libfreetype --enable-libfribidi --enable-libass --enable-libzimg
```

El SHA-256 del fichero servido coincide con el de `node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm`
(`9f57947a…`), por lo que lo auditado es exactamente lo que se sirve.

### 5.2 Captura de `ffmpeg.exec(['-version'])` en runtime

Ejecutado en el navegador contra el binario servido por el sitio:

```
ffmpeg version 5.1.4 Copyright (c) 2000-2023 the FFmpeg developers
built with emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.40
configuration: --target-os=none --arch=x86_32 … --enable-gpl --enable-libx264 --enable-libx265 …
libavutil      57. 28.100 / 57. 28.100
libavcodec     59. 37.100 / 59. 37.100
libavformat    59. 27.100 / 59. 27.100
libavdevice    59.  7.100 / 59.  7.100
libavfilter     8. 44.100 /  8. 44.100
libswscale      6.  7.100 /  6.  7.100
libswresample   4.  7.100 /  4.  7.100
libpostproc    56.  6.100 / 56.  6.100
código de salida: 0
```

### 5.3 Aplicación de las reglas de decisión

| Regla | Resultado |
| --- | --- |
| ¿`--enable-nonfree`? | **No.** No se detiene la ejecución. |
| ¿`--enable-gpl`, `libx264` o `libx265`? | **Sí**, los tres. |

### → **CLASIFICACIÓN: `VARIANTE_GPL`**

El binario es una build **GPL**, no LGPL. Consecuencias:

1. El conjunto `public/assets/wasm/ffmpeg-core.*` se distribuye bajo **GPL-2.0-or-later**
   (coincide con el `license` declarado en `node_modules/@ffmpeg/core/package.json`).
2. El proyecto debe ofrecer el **código fuente correspondiente** de esta build (Fase 2.3).
3. No se puede ofrecer una variante LGPL del binario sin reconstruirlo.

### 5.4 Librerías incluidas en el binario

Detectadas en las cadenas del WASM: `libavcodec`, `libavformat`, `libavutil`, `libswscale`,
`libswresample`, `libpostproc`, `libavfilter`, `libavdevice`, `x264`, `x265`, `libvpx`,
`libmp3lame`, `libopus`, `libvorbis`, `libwebp`, `zlib`, `libfreetype`, `libass`, `fontconfig`.

Versiones exactas, fijadas en el `Dockerfile` de `ffmpegwasm/ffmpeg.wasm` en el tag `v0.12.10`:

| Librería | Versión fijada | Licencia |
| --- | --- | --- |
| FFmpeg | `n5.1.4` | LGPL-2.1+ / **GPL-2.0+** según la build |
| x264 | rama `4-cores` (fork `ffmpegwasm/x264`) | GPL-2.0-or-later |
| x265 | rama `3.4` (fork `ffmpegwasm/x265`) | GPL-2.0-or-later |
| libvpx | `v1.13.1` | BSD-3-Clause |
| libmp3lame | `master` (`ffmpegwasm/lame`) | LGPL-2.0-or-later |
| libogg | `v1.3.4` | BSD-3-Clause |
| libtheora | `v1.1.1` | BSD-3-Clause |
| libopus | `v1.3.1` | BSD-3-Clause |
| libvorbis | `v1.3.3` | BSD-3-Clause |
| zlib | `v1.2.11` | Zlib |
| libwebp | `v1.3.2` | BSD-3-Clause |
| freetype2 | `VER-2-10-4` | FTL (equivalente a GPL-2.0+ con excepción de fuente) |
| fribidi | `v1.0.9` | LGPL-2.1-or-later |
| harfbuzz | `5.2.0` | MIT (antiguo estilo) |
| libass | `0.15.0` | ISC |
| zimg | `release-3.0.5` | Zlib |
| Emscripten | `emscripten/emsdk:3.1.40` | MIT |

**Código fuente correspondiente** de esta build:

- FFmpeg n5.1.4: <https://github.com/FFmpeg/FFmpeg/tree/n5.1.4> · tarball: <https://ffmpeg.org/releases/ffmpeg-5.1.4.tar.xz>
- Scripts y parches del build: <https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10>
  (commit `c3a763857c5e615ae8674715ad5e4f63ff469e9d`, 2023-12-25), directorio `build/`.

---

## 6. SPDX del proyecto y compatibilidad

### 6.1 Compatibilidad

| Componente | Licencia | ¿Compatible con AGPL-3.0? |
| --- | --- | --- |
| `@imgly/background-removal` | AGPL-3.0 (sin «or later») | Sí — impone AGPL-3.0 |
| `@ffmpeg/core` | GPL-2.0-or-later | Sí — la cláusula «or later» permite elegir AGPL-3.0 |
| `pdfjs-dist`, `xlsx`, `@jsquash/avif` | Apache-2.0 | Sí — compatibles con GPLv3/AGPLv3 |
| `dompurify` | MPL-2.0 OR Apache-2.0 | Sí — se electa Apache-2.0 |
| `heic2any` | MIT | Sí |
| Resto | MIT / BSD / ISC | Sí |

El análisis de compatibilidad oficial de la FSF admite combinar código *GPL-2.0-or-later* con
obras *AGPL-3.0*: la cláusula «or later» permite al usuario elegir la AGPL-3.0 como licencia
para ese componente, y la AGPL-3.0 §13 es compatible con la GPL-3.0.

### 6.2 Identificador elegido: `AGPL-3.0-only`

El encargo permitía `AGPL-3.0-or-later` o `AGPL-3.0-only` según las dependencias. Se opta por
**`AGPL-3.0-only`** por una razón concreta y verificable:

> `@imgly/background-removal@1.7.0` **no incluye ninguna cláusula «or later»**. Su
> `LICENSE.md` es el texto de la AGPL v3 sin modification alguna, y el código distribuido
> (`dist/index.mjs`, `dist/index.cjs`) **no contiene** el aviso per-file
> «either version 3 of the License, or (at your option) any later version» (verificado por
> búsqueda). Su `README.md` dice literalmente: *«The software is free for use under the AGPL
> License. Please contact support@img.ly for questions about other licensing options.»*

Es decir, el licenciante concede **AGPL-3.0 y nada más**. Declarar el proyecto como
«or-later» atribuiría al titular un derecho que la licencia de `@imgly` no le concede sobre
esa parte del trabajo combinado. `AGPL-3.0-only` es la opción que satisface simultáneamente
todas las licencias de entrada.

### 6.3 Opción de negocio (no aplicada)

`@imgly/background-removal` ofrece **licenciamiento comercial** a través de
`support@img.ly` (sección *License* de su README). Si el propietario del sitio Obtuviera una
licencia comercial de IMG.LY, el proyecto podría abandonar la AGPL y.publicar bajo una licencia
más permisiva, conservando la GPL-2.0-or-later de FFmpeg (que seguiría siendo copyleft). Esta
vía **no se ha ejercido**: el proyecto se publica bajo AGPL-3.0-only.

---

## 7. Puntos con discrepancia o resueltos por criterio restrictivo

### 7.1 Licencia de los pesos IS-Net

| Fuente | Declara |
| --- | --- |
| `node_modules/@imgly/background-removal/ThirdPartyLicenses.json` | `MIT` |
| Repositorio de origen <https://github.com/xuebinqin/DIS> (`LICENSE.md`) | **Apache-2.0** |

Discrepancia real entre el distributore y el upstream. **Se adopta Apache-2.0**, por ser la
fuente primaria del modelo y por ser la licencia más restrictiva de las dos. Se registra aquí
porque es el único punto de la auditoría donde dos fuentes autorizadas discrepan.

### 7.2 `sharp` con LGPL-3.0

`sharp` es una `optionalDependency` de Astro y aparece en `node_modules` con licencia
`Apache-2.0 AND LGPL-3.0-or-later`. El proyecto **no** usa la API de imágenes de Astro
(0 ficheros usan `astro:assets`), por lo que el binario no se ejecuta, no se carga y no se
distribuye. La LGPL-3.0 solo obliga cuando se distribuye el obra; no aplica. Aun así, queda
listado en la tabla de terceros por transparencia.

### 7.3 Dependencias sin SPDX declarativo

`@imgly/background-removal` declara `"license": "SEE LICENSE IN LICENSE.md"`, que
`license-checker-rseidelsohn` reporta como `Custom: LICENSE.md`. Se resolvió leyendo el
fichero: es la AGPL-3.0. Se documenta para que el generador de la Fase 2 lo interprete bien.

---

## 8. Limpieza de secretos

| Comprobación | Resultado |
| --- | --- |
| `.env`, `.env.local`, `.env.production` ignorados por Git | ✅ `.gitignore:15-17` |
| Ficheros `.env*` versionados en el historial | Solo `.env.example` (plantilla, sin valores) |
| Patrones de credenciales en los 4 commits del historial | **0 hallazgos** |

Patrones inspeccionados: AWS (AKIA / secret), claves de API de Google (`AIza…`), IDs y secretos
OAuth de Google, PAT de GitHub (`gh[pousr]_…`, `github_pat_…`), tokens de Slack, claves de
Stripe, OpenAI y Anthropic, bloques de clave privada PEM, JWT `eyJ…` y cadenas de conexión con
credenciales embebidas.

`public/ads.txt` y `public/ads.txt` no contienen credenciales: el ID de editor de AdSense es un
identificador público, no un secreto.

---

## 9. Obligaciones derivadas y plan de cumplimiento

### AGPL-3.0 (`@imgly/background-removal`)

| § | Obligación | Cumplimiento previsto |
| --- | --- | --- |
| 4 | El trabajo combinado se licencia bajo AGPL-3.0 | `LICENSE` en la raíz + `license` en `package.json` (Fase 1) |
| 5 | Incluir una copia de la licencia | `LICENSE` (AGPL-3.0 canónica) + `/licencias` (Fases 1 y 3) |
| 5 | Mantener los avisos de copyright | Cabeceras `SPDX-License-Identifier` en el código propio (Fase 1) |
| **13** | **Ofrecer el código fuente correspondiente a quien interactúa por red** | Enlace «Código fuente» en el pie de todas las páginas + `/licencias` → repositorio público con el commit exacto desplegado (Fases 2 y 4) |
| 6 | No añadir restricciones adicionales | La marca «ConvertiLocal» se excluye expresamente (Fase 1) |

### GPL-2.0-or-later (FFmpeg, `VARIANTE_GPL`)

| § | Obligación | Cumplimiento previsto |
| --- | --- | --- |
| 2 | Entregar copia de la GPL-2.0 junto al programa | `public/licencias/gpl-2.0.txt` (Fase 2) |
| 2 | Conservar los avisos de copyright y la exención de garantía | Texto de FFmpeg y de la GPL en `/licencias` (Fase 3) |
| 2, 4 | Hacer disponible el código fuente correspondiente | Manifiesto con FFmpeg `n5.1.4` + tag `v0.12.10` de ffmpeg.wasm (Fase 2.3) |
| — | Nota de marca de Fabrice Bellard | «FFmpeg es una marca de Fabrice Bellard» (Fase 3) |

### Apache-2.0 (PDF.js, SheetJS, @jsquash/avif, IS-Net)

| § | Obligación | Cumplimiento previsto |
| --- | --- | --- |
| 4 | Conservar los avisos de copyright y de licencia | `THIRD_PARTY_LICENSES.md` + `public/licencias/terceros.txt` (Fase 2) |
| 4 | Incluir el `NOTICE` si existe | Verificado: `pdfjs-dist` no distribuye `NOTICE` propio; el de Apache se incluye como referencia |
| 3 | Declarar las modificaciones | El proyecto no modifica ninguno de estos componentes |

---

## 10. Conclusión de la Fase 0

- **No se detectan licencias `UNKNOWN` sin resolver.** Las dos entradas no declarativas
  (`Custom: LICENSE.md` y `UNLICENSED`) están resueltas: la primera es AGPL-3.0, la segunda es
  el propio proyecto, que se licencia en la Fase 1.
- **No hay componentes `nonfree`.** La build de FFmpeg es GPL, no `--enable-nonfree`.
- **No hay incompatibilidades.** AGPL-3.0 + GPL-2.0-or-later + Apache-2.0 + MIT es un conjunto
  compatible.
- **La ejecución continúa a la Fase 1** con `AGPL-3.0-only` como SPDX del proyecto.

Documento generado por auditoría automatizada. No constituye asesoría legal; antes de publicar
conviene validarlo con un profesional del sector.

---

## 11. Verificación posterior al despliegue (2026-10-21)

Comprobación del estado real tras el primer despliegue en Vercel. Los hallazgos que **no
coinciden con lo que se afirmaba** antes del despliegue se marcan con ⚠.

### 11.1 Código fuente y repositorio

| Comprobación | Resultado |
| --- | --- |
| `git ls-remote` anónimo | ✅ **Accesible sin autenticación** (el repositorio pasó a `visibility: PUBLIC`). |
| `https://github.com/SantyCalz/convertilocal` sin sesión | ✅ **HTTP 200**. |
| Commit desplegado en producción | ✅ `3d0a7803…` → `4db9eec5…` conforme se publicaba; `SOURCE_URL` contiene el SHA real en `/`, `/licencias`, `/terminos`, `/privacidad` y `/imagenes/eliminar-fondo`. Sin `undefined` ni vacíos. |
| GitHub Release `corresponding-source-v1.0.0` | ✅ **Existe** (publicado el 2026-10-21, tag en `4db9eec`). |
| Assets del release | ✅ 15 assets descargables **sin autenticación** (HTTP 200 en todos). |
| Hashes del release | ✅ **14/14 verificados** tras descarga anónima (SOURCES.json no se verifica contra sí mismo). |

El release contiene el tarball de FFmpeg n5.1.4, x264 (`4-cores`), x265 (tag `3.4`), los scripts
de compilación de ffmpeg.wasm (`v0.12.10`), la línea `configuration:` completa, `BUILD.md` y los
textos de licencia, con `SOURCES.json` como manifiesto de hashes.

> Nota: la primera versión del manifiesto usaba rutas con subcarpeta (`source/…`, `LICENSES/…`)
> mientras que GitHub guarda los assets en plano. Se corrigió y se volvió a subir el manifiesto.

> ⚠ **Pendiente de publicación:** el dominio canónico **`convertilocal.com` no tiene DNS**
> (`NXDOMAIN`). El sitio solo responde en `https://convertilocal.vercel.app`. Como el origen
> público ahora se define en `PUBLIC_SITE_URL` (con ese subdominio como valor por defecto), las
> canónicas, `og:url`, los JSON-LD, el sitemap y `robots.txt` ya apuntan al host que responde,
> y Google Search Console puede validarlo. Queda pendiente apuntar el dominio: cuando se haga,
> basta cambiar `PUBLIC_SITE_URL` (afecta a `src/data/site.ts`, `astro.config.mjs` y los scripts
> de verificación, que leen la misma variable).
>
> Mientras tanto, el `ads.txt` se sirve desde `convertilocal.vercel.app` y AdSense exige que
> esté en el dominio registrado de la cuenta.


### 11.2 Redirecciones

| Comprobación | Resultado |
| --- | --- |
| `/politica-de-privacidad` en producción | Antes: **HTTP 200** con `<meta http-equiv="refresh">` (no era redirección real) |
| `/terminos-y-condiciones` en producción | Antes: **HTTP 200** con `<meta http-equiv="refresh">` |
| Corrección | `vercel.json` → `redirects` con `permanent: true` (**308**) y `netlify.toml` → `status = 301`. Las páginas meta-refresh de Astro se conservan como respaldo para otros alojamientos y para `astro preview`. |
| Sitemap | ✅ Las dos rutas redireccionadas siguen **excluidas** del sitemap (`astro.config.mjs`, filtro `sitemap()`). |

### 11.3 Paquete de datos del modelo (`@imgly`)

| Fuente | Declara |
| --- | --- |
| `ThirdPartyLicenses.json` de `@imgly/background-removal` | ISNET → **MIT** |
| Repo de origen `xuebinqin/DIS` (`LICENSE.md`) | **Apache-2.0** |
| `README.md` de `DIS` (línea 170) | «Our code and evaluation metric use Apache License 2.0» + los datos DIS5K tienen **términos de uso propios** (`DIS5K-Dataset-Terms-of-Use.pdf`) |

> ⚠ **Sí, el paquete de datos tiene un régimen de licencia propio, distinto del paquete
> principal.** El paquete principal es AGPL-3.0; los **pesos del modelo** se distribuyen como
> datos binarios con una declaración de licencia separada. Y hay **tres** regímenes distintos en
> juego, no dos:
>
> 1. **Código y métrica** del proyecto DIS → Apache-2.0.
> 2. **Pesos del modelo** → declarados como MIT por img.ly; el repo upstream no lleva una
>    licencia específica para ellos (se distribuyen vía Google Drive) y no hay `LICENSE`
>    propio dentro de los datos servidos.
> 3. **Dataset DIS5K** → términos de uso propios, distintos de cualquier licencia OSS.
>
> Los bytes servidos son pesos **ONNX cuantizados** (`onnx.quantize 0.1.0`), no los `.pth`
> originales, y **no llevan ninguna cabecera de licencia embebida** (verificado sobre el primer
> y el último fragmento: sin texto de licencia). Tampoco se sirve ningún `LICENSE` ni
> `NOTICE` junto a los datos.
>
> Se mantiene la decisión de la §7.1 —adoptar Apache-2.0 por ser la fuente primaria— y se
> señala que la declaración MIT de img.ly no está respaldada por ningún fichero de licencia en
> el propio paquete de datos.

### 11.4 Clon limpio

| Comprobación | Resultado |
| --- | --- |
| `git clone` + `npm ci` + `npm run build` | ✅ **Compila sin ningún archivo local.** 618 paquetes en 16 s, 75 páginas en 7,25 s. |
| `public/assets/imgly/` en el clon | Ausente (no versionado) → `prebuild` lo descarga: **159,7 MB / 45 ficheros** presentes en `dist/`. |
| `public/assets/pdf/` en el clon | Ausente (no versionado) → regenerado por `sync:pdf` desde `node_modules`. |
| `public/assets/wasm/` en el clon | **Presente** (30,8 MB versionados). |
| `check:legal` en el clon | ✅ Pasa. |

### 11.5 Binarios de `sharp` / libvips

✅ **No hay ninguno.** Ni en `dist/` ni en `public/`: cero ficheros `.node`, `.so` o `.dylib`,
y cero coincidencias con `sharp`, `libvips` o `vips`. Los únicos binarios servidos son
`assets/wasm/ffmpeg-core.wasm` (30,7 MB) y el runtime de ONNX (22,8 MB).

### 11.6 Texto legal

| Elemento | Antes | Ahora |
| --- | --- | --- |
| Campo de identificación fiscal | `NIF` | `Identificación fiscal` (`LEGAL_ENTITY.taxId`) |
| `LEGAL_ENTITY` | `name`, `nif`, `address`, `country`, `hosting` | `name` y `email` **obligatorios**; el build **falla** si están vacíos o si el email no tiene forma válida. `taxId` y `address` descriptivos. |
| Fuente del email | `hola@convertilocal.com` escrito a mano en 6 sitios | `LEGAL_ENTITY.email`, único. `SITE.email` referencia `LEGAL_ENTITY.email`. |
| Afirmación sobre el RGPD | «el RGPD permite identificarlos y facilitarlos bajo petición» | **Eliminada.** No se afirma qué admite ni qué no la normativa. |

Verificado: vaciar `name`, vaciar `email` o poner un email inválido hace **fallar el build**; al
restaurar los valores, vuelve a compilar.

### 11.7 Integridad de los assets descargados

Los 159,7 MB de assets de @imgly se descargan en `prebuild` desde `staticimgly.com`. Para que
el material servido sea exactamente el auditado y no dependa de lo que sirvan los hosts externos,
sus hashes SHA-256 están fijados en **`assets-integrity.json`** (versionado en el repositorio).

| Comprobación | Resultado |
| --- | --- |
| Fragmentos fijados | 44 (159,7 MB) + `resources.json` (22,2 KB) |
| `npm run sync:bg` | Verifica el hash de **cada** fragmento, también de los que ya estaban en caché. |
| `npm run sync:bg -- --check` | Comprueba presencia **y** hash de los 45 ficheros. |
| Manipulación de un byte | ✅ **Detectada**: `resources.json no coincide con el hash fijado` y el build falla con código 1. |
| `assets-integrity.json` ausente | El build falla indicando cómo regenerarlo. |

Los nombres de los fragmentos **son** su propio SHA-256, así que el manifiesto es coherente por
construcción. El hash fijado de `resources.json` es lo que impide que un host externo cambiado
sirva un índice de recursos distinto junto con sus fragmentos.

### 11.8 Diferencias respecto al informe original

| # | Lo que decía el informe | Lo que se encontró |
| --- | --- | --- |
| 1 | «el repositorio es público» (suposición de la tarea) | ⚠ Era **privado**. Ya corregido: `visibility: PUBLIC` y `git ls-remote` anónimo funciona. |
| 2 | «existe el Release `corresponding-source-*`» | ⚠ **No existía**. Publicado el 2026-10-21 con 15 assets, 14/14 hashes verificados. |
| 3 | Las redirecciones «301/308 reales» | Eran **meta-refresh con HTTP 200**. Corregido en `vercel.json` (308) y `netlify.toml` (301). |
| 4 | IS-Net con licencia propia «distinta de la del paquete principal» | ⚠ Cierto, pero **más complejo** de lo indicado: hay **tres** regímenes (código Apache-2.0, pesos declarados MIT, dataset con términos propios), no dos. |
| 5 | `LEGAL_ENTITY` con «NIF» | Ahora `Identificación fiscal`, con `name` y `email` obligatorios y validación en build. |
| 6 | El repositorio «contiene el modelo de 126 MB» | ⚠ No lo contiene: son **159,7 MB** y **no están versionados** (se descargan en `prebuild` y se verifican con `assets-integrity.json`). El modelo de segmentación en sí son ~126 MB; el resto es el runtime de ONNX para CPU y WebGPU. |
| 7 | «sin binarios de sharp» | ✅ Confirmado. |
| 8 | — | ⚠ **Nuevo:** el dominio `convertilocal.com` no resuelve (NXDOMAIN). El origen público pasó a ser configurable con `PUBLIC_SITE_URL`, cuyo valor por defecto es el subdominio de Vercel: ese sí responde y puede validarse en Search Console. Queda pendiente apuntar el dominio. |\n\n## 12. Fase 4: Ghostscript WASM para PDF/A (2026-10-22)

La conversión PDF → PDF/A-2b añade una segunda dependencia con copyleft que se
distribuye al navegador: **`@jspawn/ghostscript-wasm@0.0.2`**, licencia
**AGPL-3.0-only**, que empaqueta Ghostscript 9.56.0 compilado a WebAssembly.

### 12.1 Qué se sirve

| Fichero | Origen | Licencia | Tamaño |
| --- | --- | --- | --- |
| `public/assets/gs/gs.wasm` | `@jspawn/ghostscript-wasm@0.0.2` | AGPL-3.0-only | 15,8 MB |
| `public/assets/gs/gs.js` | idem | AGPL-3.0-only | 104 KB |
| `public/assets/gs/gs.mjs` | idem | AGPL-3.0-only | 0,7 KB |
| `public/assets/gs/PDFA_def.ps` | ghostpdl 9.56.0 | AGPL-3.0-only | 3,0 KB |
| `public/assets/gs/srgb.icc` | ghostpdl 9.56.0 | AGPL-3.0-only | 2,5 KB |

Los cinco ficheros están fijados en `assets-integrity.json` y se verifican en
`npm run sync:gs` (que corre en `prebuild`). Ninguno se sirve desde un CDN: el
worker los carga de `/assets/gs/` en el propio dominio.

### 12.2 Desviación consciente: SAFER + inyección con pdf-lib

La build WASM de Ghostscript 9.56.0 **no admite `--permit-file-read`**, así que
en modo `-dSAFER` no puede leer el perfil ICC desde el sistema de ficheros
virtual y `-dPDFA=2` se ignora silenciosamente. Con `-dNOSAFER` sí funciona,
pero desactiva el aislamiento del intérprete PostScript.

Decisión adoptada: **mantener `-dSAFER`** y limitar Ghostscript a la
optimización del PDF (reescritura, eliminación de objetos no usados,
incrustación de fuentes). El `OutputIntent` con el perfil ICC sRGB y los
metadatos XMP `pdfaid:part=2` / `pdfaid:conformance=B` se inyectan después con
**pdf-lib** (MIT) sobre la salida optimizada. El resultado se etiqueta como
**«PDF/A-2b (mejor esfuerzo, preservación digital no certificada)»**: no se
afirma conformidad certificada.

### 12.3 Obligaciones AGPL-3.0 adicionales

- El código fuente de `gs.wasm` se publica en el release
  **`corresponding-source-v1.1.0`** (tarball oficial `ghostscript-9.56.0.tar.xz`
  de Artifex, SHA-512 fijado y verificado).
- `@jspawn/ghostscript-wasm` aparece en `THIRD_PARTY_LICENSES.md` y en
  `/licencias` (generados por `scripts/generate-third-party.mjs`).
- El sitio sigue sirviendo el código fuente de la versión desplegada desde un
  repositorio público (AGPL-3.0 §13).

### 12.4 Presupuesto de JS

`gs.wasm` (15,8 MB) es un binario diferido: se descarga solo tras pulsar
**«Preparar conversor (≈16 MB)»** y queda en la caché HTTP. `check-js-budget.mjs`
excluye los `.wasm` del límite de chunks diferidos (igual que AVIF y ONNX) y
documenta la excepción; el código JS propio sigue sujeto al presupuesto.
