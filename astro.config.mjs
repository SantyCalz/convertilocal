// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// Cambia `site` cuando el dominio definitivo esté configurado.
// También debes actualizarlo en `src/data/site.ts`.
const SITE_URL = 'https://convertilocal.com';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  compressHTML: true,
  /**
   * Las políticas legales se publicaron primero con nombres largos y ahora
   * viven en rutas cortas. Las redirecciones evitan tener dos versiones del
   * mismo documento (contenido duplicado) y conservan los enlaces anteriores.
   */
  redirects: {
    '/politica-de-privacidad': '/privacidad',
    '/terminos-y-condiciones': '/terminos',
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      // Las páginas de redirección no deben indexarse.
      filter: (page) =>
        !page.includes('/demo-file-processor') &&
        !page.includes('/politica-de-privacidad') &&
        !page.includes('/terminos-y-condiciones'),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      // El presupuesto de JS se comprueba en scripts/check-js-budget.mjs.
      assetsInlineLimit: 2048,
    },
  },
});
