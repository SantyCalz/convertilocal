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
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) => !page.includes('/demo-file-processor'),
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
