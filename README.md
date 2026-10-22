# ConvertiLocal

Suite de micro-herramientas de conversión y manipulación de archivos que funciona **100 % en el navegador**. Tus archivos nunca salen de tu dispositivo.

> **Estado:** Suite completa hasta Fase 5. Incluye imagen, PDF, datos/texto y audio/video, con validacion estatica, presupuesto JS y preparacion de despliegue.

## Licencia

Copyright (C) 2026 ConvertiLocal contributors.

Este proyecto se publica bajo la **GNU Affero General Public License v3.0 únicamente**
(`AGPL-3.0-only`). El texto íntegro y canónico de la licencia está en [`LICENSE`](LICENSE).

La AGPL-3.0 obliga a ofrecer el **código fuente correspondiente** a cualquier persona que
interactúe con el sitio a través de la red. El código de este repositorio está en
<https://github.com/SantyCalz/convertilocal> y el enlace «Código fuente» del pie de cada página
apunta al commit exacto que está desplegado.

El proyecto incluye componentes con copyleft:

| Componente | Licencia |
| --- | --- |
| [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) | AGPL-3.0 |
| [`@ffmpeg/core`](https://github.com/ffmpegwasm/ffmpeg.wasm) (build **GPL**) | GPL-2.0-or-later |

El detalle completo de la auditoría de licencias —incluida la variante exacta del binario de
FFmpeg y el manifiesto de código fuente correspondiente— está en
[`docs/LICENSE_AUDIT.md`](docs/LICENSE_AUDIT.md) y en la página pública
[`/licencias`](https://convertilocal.com/licencias).

### Marca

«ConvertiLocal», el nombre del dominio y el diseño gráfico son marcas de sus respectivos
titulares y **no están cubiertos por la AGPL-3.0**. La licencia cubre el código fuente del
proyecto; no otorga ningún derecho sobre la marca, el nombre ni los logotipos. «FFmpeg» es una
marca de Fabrice Bellard. Google AdSense y las marcas de Google son de Google LLC.

## Stack

- **Astro 5** con `output: 'static'` (SSG puro, sin SSR ni adapter).
- **Tailwind CSS 3.4** con tokens en `tailwind.config.mjs`.
- **TypeScript estricto** y JavaScript vanilla en módulos.
- **Procesamiento de imagen:** Web Worker + `OffscreenCanvas`, con codificadores propios para BMP/ICO, Canvas para PNG/JPG/WebP, WASM para AVIF y `heic2any` para HEIC.

## Comandos

```bash
npm install
npm run dev              # servidor local
npm run build            # build estático en dist/
npm run preview          # sirve el build
npm run check            # Astro + TypeScript
npm run lint             # ESLint (TS + Astro)
npm run format           # Prettier
npm run sync:bg          # assets autoalojados de @imgly/background-removal
npm run validate:content # coherencia de formats.json, conversions.json y tarjetas
npm run validate:html    # JSON-LD parseable y enlaces internos (requiere build)
npm run check:legal       # LICENSE AGPL, pie legal, placeholders y hosts externos
npm run budget           # build + presupuesto de JS inicial (50 KB gzip por página)
npm run validate         # check + lint + contenido + budget + HTML
npm run test:e2e         # Playwright sobre el build
npm run deploy:check     # validate + verify:deploy + check:legal
```

### Binarios y modelos: qué está versionado y qué se descarga

El repositorio no lleva dentro los ficheros pesados que se sirven al navegador.
Un clon limpio se compila solo, porque `prebuild` los obtiene antes de compilar:

| Recurso | Tamaño | ¿Versionado? | Cómo se obtiene |
| --- | ---: | --- | --- |
| `public/assets/wasm/ffmpeg-core.wasm` (+ `.js`) | 30,7 MB | **Sí** | Se copia de `node_modules/@ffmpeg/core` con `npm run sync:media` |
| `public/assets/imgly/**` (modelo IS-Net + runtime ONNX) | 159,7 MB | **No** (`.gitignore`) | `npm run sync:bg` los descarga de `staticimgly.com` |
| `public/assets/pdf/**` (PDF.js) | 3,4 MB | **No** (`.gitignore`) | `npm run sync:pdf` los copia de `node_modules/pdfjs-dist` |
| `public/scripts/pdf.worker.min.mjs` | 1,3 MB | **No** (`.gitignore`) | `npm run sync:pdf` |

```bash
git clone https://github.com/SantyCalz/convertilocal.git
cd convertilocal
npm ci
npm run build      # prebuild descarga 159,7 MB la primera vez
```

Los scripts de sincronización son **idempotentes**: `npm run sync:bg` no vuelve a
descargar lo que ya está, y `npm run sync:bg -- --check` verifica que todos los
fragmentos están presentes **y que sus hashes coinciden** sin descargar nada.

### Integridad de los assets descargados

Los 159,7 MB que vienen de `staticimgly.com` tienen sus hashes SHA-256 fijados en
[`assets-integrity.json`](assets-integrity.json), versionado en el repositorio. El
build los verifica uno a uno, así que el material que se sirve es exactamente el
auditado y un cambio en el host externo hace **fallar el build** en lugar de
desplegar algo distinto de lo revisado.

```bash
npm run sync:bg -- --check                     # verifica presencia y hashes
node scripts/write-assets-integrity.mjs        # regenera el manifiesto (a propósito)
```

Si el manifiesto no existe, `npm run sync:bg` falla indicando cómo generarlo: sin
él no se puede garantizar qué se está sirviendo.

El modelo de segmentación son 159,7 MB porque incluye los tres pesos (isnet,
isnet_fp16 e isnet_quint8) y el runtime de ONNX para CPU y WebGPU. Para una
instalación mínima basta con el modelo pequeño:

```bash
npm run sync:bg -- --only=/models/isnet_quint8
```

## Rutas publicadas

- `/` — inicio, buscador y catálogo.
- `/convertir` — hub con las 20 conversiones y la guía de los 7 formatos.
- `/convertir/[conversion]` — 20 páginas: JPG, PNG, WebP, HEIC, AVIF, BMP e ICO.
- `/imagenes/reducir-foto-a-kb` — compresión por peso objetivo o calidad manual.
- `/imagenes/quitar-exif-foto` — limpieza de EXIF/XMP/GPS en JPG, PNG y WebP.
- `/imagenes/eliminar-fondo` — eliminación de fondo con modelo IS-Net autoalojado.
- `/imagenes/redimensionar` — ancho, alto, proporción y ajuste configurable.
- `/imagenes/recortar` — recorte por coordenadas exactas en píxeles.
- `/convertir/jpg-a-pdf`, `/convertir/png-a-pdf` — imágenes a PDF con márgenes en mm.
- `/convertir/pdf-a-jpg`, `/convertir/pdf-a-png` — PDF a imagen con rango de páginas y DPI.
- `/licencias` — licencias y atribuciones (AGPL, FFmpeg GPL, terceros).
- `/terminos` — términos de uso.
- `/privacidad` — política de privacidad.

Conversiones: `jpg-a-png`, `png-a-jpg`, `webp-a-png`, `webp-a-jpg`, `jpg-a-webp`, `png-a-webp`, `heic-a-jpg`, `heic-a-png`, `avif-a-jpg`, `avif-a-png`, `jpg-a-avif`, `png-a-avif`, `bmp-a-png`, `bmp-a-jpg`, `jpg-a-bmp`, `png-a-bmp`, `png-a-ico`, `jpg-a-ico`, `webp-a-ico`, `ico-a-png`.

## Estructura

```text
src/
├─ components/
│  ├─ FileProcessor.astro      UI de carga, opciones, progreso y resultados
│  ├─ tools/ToolPageShell.astro
│  ├─ legal/                   LegalDocument, ThirdPartyTable, SourceLinks, avisos
│  ├─ ConversionLimits.astro   «Qué hace / Qué no hace» de cada herramienta
│  ├─ home/                    Hero, buscador, categorías, recientes
│  ├─ layout/                  Header, MobileMenu, Footer
│  └─ ui/                      Icon, Logo, Badge, Button, AdSlot…
├─ content/legal/              Textos legales aislados (privacidad, términos, licencias)
├─ data/
│  ├─ formats.json             Guía de 7 formatos
│  ├─ conversions.json         20 páginas con contenido SEO único
│  ├─ conversion-cards.json    Proyección ligera para el catálogo
│  ├─ documents-tools.json     Conversiones de documentos (imagen ↔ PDF)
│  ├─ images.ts                Helpers tipados de contenido
│  └─ tools.ts, nav.ts, site.ts, categories.ts
├─ pages/
│  ├─ convertir/index.astro
│  ├─ convertir/[conversion].astro
│  ├─ convertir/{jpg-a-pdf,png-a-pdf,pdf-a-jpg,pdf-a-png}.astro
│  ├─ imagenes/reducir-foto-a-kb.astro
│  ├─ imagenes/quitar-exif-foto.astro
│  ├─ imagenes/eliminar-fondo.astro
│  ├─ imagenes/redimensionar.astro
│  ├─ imagenes/recortar.astro
│  ├─ licencias.astro, terminos.astro, privacidad.astro
│  ├─ demo-file-processor.astro   (laboratorio interno, noindex)
│  └─ legales y home
├─ scripts/
│  ├─ core/image/              sniff, canvas, bmp, ico, metadata, target-size…
│  ├─ core/file-processor.ts   validación, opciones, previews y descargas
│  ├─ core/file-reorder.ts     reordenación por arrastre de la lista de archivos
│  ├─ core/download.ts         ZIP diferido con fflate
│  ├─ processors/image/        converter, compressor, exif-cleaner, heic,
│  │                           remove-background, resize, crop
│  ├─ processors/registry.ts   carga diferida por id
│  └─ workers/image.worker.ts  worker único de imagen
├─ styles/global.css
└─ types/                      processor, image, tool, icon
```

## Arquitectura de imagen

- **Un worker por página:** `image.worker.ts` recibe `File` + opciones y devuelve `Blob` + metadatos. El cliente usa RPC con ids y progreso.
- **Validación por magic bytes:** `sniff.ts` detecta PNG, JPG, WebP, AVIF, BMP, ICO y HEIC antes de procesar. La extensión y el MIME declarados no son suficientes.
- **Límites:** 25 MB por archivo, 120 MB por lote, 20 archivos, 16 384 px por lado y 80 MP por imagen.
- **Codificadores:** Canvas para PNG/JPG/WebP; BMP e ICO propios; AVIF con `@jsquash/avif` (WASM, carga diferida); HEIC con `heic2any` en el hilo principal y su propio worker interno.
- **Compresión a peso:** búsqueda binaria de calidad y reducción progresiva de dimensiones si el objetivo no se alcanza. Salida JPG, WebP o AVIF.
- **EXIF:** limpieza sin pérdida de JPG/PNG/WebP conservando ICC. Si la orientación EXIF es distinta de 1 y se decide corregir, se decodifica, rota y recodifica para evitar fotos giradas.
- **Descargas:** un archivo usa Blob + `<a download>` o Web Share en iOS. Varios se empaquetan en ZIP local con `fflate` (máximo 200 MB); si falla, se descargan por separado.
- **Presupuesto:** `scripts/check-js-budget.mjs` calcula el JS inicial por página (scripts + `modulepreload` + imports estáticos) y lo limita a 50 KB gzip. Los chunks de `import()` (HEIC, AVIF, fflate, procesadores) se reportan aparte y no cuentan.

## Contenido y SEO

`formats.json` contiene historia, compresión, usos, cuándo evitar, tres errores y FAQ de PNG, JPG, WebP, AVIF, BMP, ICO y HEIC. `conversions.json` contiene las 20 páginas con introducción, razones, casos de uso, errores, FAQ, keywords y enlaces relacionados.

`npm run validate:content` comprueba:

- 7 formatos y 20 conversiones, sin slugs duplicados.
- Coherencia `from`/`to`, procesador correcto (HEIC usa `heic-convert`).
- Longitud de metadescripción, número mínimo de FAQ/usos/errores.
- Relaciones existentes y sin autorreferencia.
- Sincronización de `conversion-cards.json` con `conversions.json`.

Cada página genera JSON-LD de `BreadcrumbList`, `FAQPage` y `HowTo`; el hub añade su propio FAQ. El layout base mantiene `WebApplication` y permite esquemas adicionales.

## Privacidad

No hay backend, formularios con subida, analítica ni cuentas. El archivo se lee con JavaScript y se borra de la memoria al cerrar la pestaña. El historial reciente vive en `localStorage`. La única descarga externa es el código diferido de AVIF/HEIC y la página en sí.

## Compatibilidad y límites conocidos

- **Chrome/Edge:** ruta principal probada con Chrome headless en escritorio.
- **Firefox:** sin QA automatizado; Canvas y WebWorker son estándar, pero conviene probar AVIF/HEIC y descargas.
- **Safari/iOS:** sin QA automatizado en dispositivo real. La descarga usa Web Share cuando hay varios archivos. HEIC nativo de Apple puede decodificarse, pero la ruta usa `heic2any` para uniformidad.
- **HEIC:** la primera conversión descarga el decodificador (incluido en el chunk diferido) y consume CPU. En móviles antiguos puede tardar.
- **AVIF:** la codificación es más lenta que JPG/WebP y el WASM pesa ~3,5 MB. Solo se descarga al generar AVIF.
- **GIF:** no se acepta como entrada en Fase 1; el detector de magic bytes no lo incluye.
- **Navegadores muy antiguos:** no se soportan.

## Antes de publicar

1. **Dominio:** el origen público se define en una sola variable, `PUBLIC_SITE_URL`
   (ver `.env.example`). Es la base de todas las URL absolutas: canónicas, `og:url`,
   `og:image`, los JSON-LD, el sitemap y la directiva `Sitemap:` de `robots.txt`.
   `src/data/site.ts` y `astro.config.mjs` leen la misma variable, de modo que nunca
   divergen. Mientras `convertilocal.com` no tenga DNS, el valor por defecto es
   `https://convertilocal.vercel.app`, que sí responde y es el que Google Search
   Console puede validar. Cuando apuntes el dominio, cambia **solo** la variable:

   ```bash
   PUBLIC_SITE_URL=https://convertilocal.com
   ```

   `npm run deploy:check` falla si alguna página compilada conserva un origen
   canónico distinto del configurado.
2. **Datos legales:** completar `LEGAL_ENTITY` en `src/data/site.ts` (identificación fiscal y
   domicilio reales) y revisar los textos con asesoría. `name` y `email` son obligatorios: el
   build falla si faltan.
3. **AdSense:** definir `PUBLIC_ADSENSE_CLIENT`, IDs de bloque y CMP antes de activar anuncios
   personalizados. El `ads.txt` debe servirse desde el dominio registrado por AdSense.
4. **OG image:** sustituir `public/assets/og-default.png` si cambia el branding.
5. **Laboratorio:** eliminar `/demo-file-processor` y su entrada oculta del catálogo.
6. **Licencias:** el proyecto ya es AGPL-3.0-only (`LICENSE` en la raíz). Revisar `docs/LICENSE_AUDIT.md` y `THIRD_PARTY_LICENSES.md`. La LGPL de libheif incluida por `heic2any` sigue pendiente de revisión legal.
7. **QA real:** repetir las pruebas en Safari/iOS, Firefox y un Android de gama media; revisar HEIC/AVIF y descargas múltiples.

## Hoja de ruta

- Fase 2: audio (MP3/WAV/OGG) y extracción desde vídeo.
- Fase 3: vídeo (MP4/WebM/GIF) con WebCodecs cuando esté disponible.
- Fase 4: documentos y datos (PDF, CSV/JSON, OCR ligero).
- Fase 5: más conversiones de imagen, incluida entrada GIF y procesamiento por lotes avanzado.

