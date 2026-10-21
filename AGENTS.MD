# AGENTS.md — Contexto Permanente & Especificación Técnica: ConvertiLocal

## 1. VISIÓN DEL PRODUCTO
ConvertiLocal es una suite de micro-herramientas de conversión y manipulación de archivos que funciona 100% Client-Side en el navegador del usuario.
- Promesa central: **"Tus archivos nunca salen de tu dispositivo"** + **"Funciona en modo avión"**.
- Modelo de negocio: Tráfico orgánico (Long-tail SEO) monetizado con Google AdSense no invasivo.

---

## 2. STACK TÉCNICO & ARQUITECTURA
- **Framework:** Astro (SSG/Estático) + Tailwind CSS + TypeScript Vanilla.
- **Procesamiento:** 100% Client-Side usando Web Workers, OffscreenCanvas, Web Audio API, `File.stream()`, y librerías compiladas a WASM o JS nativo.
- **Contrato Único de Procesador:**
  ```typescript
  export interface ProcessorOptions {
    [key: string]: any;
  }

  export interface Processor {
    id: string;
    accepts: string[]; // Mime-types o extensiones
    run(
      files: File[], 
      options: ProcessorOptions, 
      onProgress?: (percent: number) => void
    ): Promise<Blob[] File[] |>;
  }
  ```

---

## 3. LICENCIA Y CUMPLIMIENTO LEGAL (BLOQUEANTE)

El proyecto se publica bajo **AGPL-3.0-only** (`SPDX-License-Identifier: AGPL-3.0-only`).
El texto canónico está en `LICENSE` y la auditoría completa en `docs/LICENSE_AUDIT.md`.

### Componentes con copyleft que se distribuyen al navegador

| Componente | Licencia | Consecuencia |
| --- | --- | --- |
| `@imgly/background-removal` | AGPL-3.0 | Obliga a ofrecer el código fuente por red (§13) |
| `@ffmpeg/core` (`ffmpeg-core.wasm`) | GPL-2.0-or-later, build **GPL** (`--enable-gpl --enable-libx264 --enable-libx265`) | Obliga a copia de la GPL-2.0 y al código fuente correspondiente |

### Reglas obligatorias al tocar este repositorio

1. **Todo fichero propio de `src/` y `scripts/` lleva cabecera SPDX.** Si creas un fichero nuevo, añade:
   ```ts
   /**
    * src/ruta/al/fichero.ts
    * Copyright (C) 2026 ConvertiLocal contributors
    * SPDX-License-Identifier: AGPL-3.0-only
    */
   ```
   `node scripts/add-spdx-headers.mjs` las añade de forma masiva; `--check` verifica que no falte ninguna.
2. **No se puede publicar nada sin el pie legal.** `scripts/check-legal.mjs` (en `npm run deploy:check`) falla si:
   - `LICENSE` no coincide con el texto canónico de la AGPL-3.0;
   - alguna página compilada carece del pie legal (enlace a `/licencias`, mención a AGPL-3.0 y enlace al código fuente);
   - queda algún marcador de plantilla (`[[...]]`, `TODO`, `OWNER_NAME`, `[Algo entre corchetes]`) en el HTML;
   - algún bundle pide a un host externo no autorizado.
3. **Ningún componente con copyleft puede pasar a CDN.** `@imgly` se sirve desde `/assets/imgly/` y FFmpeg desde `/assets/wasm/`. El test `tests/e2e/legal.spec.ts` verifica en runtime que no hay peticiones fuera del propio dominio (salvo AdSense).
4. **Los textos legales viven en `src/content/legal/`**, no dentro de las plantillas. `src/content/legal/third-party.json` se **genera** en el build: no editarlo a mano.
5. **Los textos de licencia se copian literalmente** desde sus fuentes oficiales (gnu.org, apache.org) a `public/licencias/`.
6. **La marca «ConvertiLocal» queda fuera de la AGPL.** No cambiar la redacción de los avisos de marca sin revisar.

### Regenerar los artefactos legales

```bash
npm run licenses   # THIRD_PARTY_LICENSES.md, public/licencias/terceros.txt, third-party.json
npm run sync:bg    # assets de @imgly/background-removal (los descarga, no se versionan)
```

### Requisitos que bloquean la publicación

1. **El repositorio debe ser público.** La AGPL-3.0 §13 obliga a que *cualquier persona* que
   interactúe con el sitio por red pueda obtener el código fuente de la versión desplegada. Con
   el repositorio en privado, el enlace «Código fuente» del pie lleva a un muro de inicio de
   sesión y la obligación **no** queda satisfecha. `REPO_URL` debe apuntar a un repositorio
   accesible sin autenticación.
2. **El release `corresponding-source-*` debe existir.** Es la parte de GPL-2.0: el código fuente
   del binario `ffmpeg-core.wasm`. Se prepara con:

   ```bash
   node scripts/build-corresponding-source.mjs   # staging en release-staging/ (no versionado)
   gh release create corresponding-source-v1.0.0 --title "…" <ficheros>
   ```

   Las instrucciones exactas están en `release/corresponding-source/README.md`. El manifiesto
   `release/corresponding-source/LICENSES/SOURCES.json` contiene el SHA-256 de cada fichero del
   release y se verifica al generarlo.

### Redirecciones

Las rutas legales antiguas (`/politica-de-privacidad`, `/terminos-y-condiciones`) se redirigen
en `vercel.json` (308) y en `netlify.toml` (301). Las páginas meta-refresh de Astro se conservan
como respaldo para otros alojamientos y para `astro preview`, y están **excluidas del sitemap**.

