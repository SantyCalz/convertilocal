// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

/**
 * Origen público del sitio.
 *
 * Se lee de `PUBLIC_SITE_URL` con el mismo valor por defecto que
 * `src/data/site.ts`, para que el sitemap y las etiquetas canónicas nunca
 * divergan. Mientras `convertilocal.com` no tenga DNS, el subdominio de
 * Vercel es el que responde.
 */
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const SITE_URL = (env.PUBLIC_SITE_URL ?? 'https://convertilocal.vercel.app')
  .trim()
  .replace(/\/$/, '');

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
      // Los códecs y las librerías de documento se cargan de forma diferida y
      // pueden pasar de 500 KB sin comprimir (heic2any ocupa ~1,3 MB). El
      // límite que importa (400 KB gzip por chunk diferido) lo vigila
      // check-js-budget.mjs; aquí solo se evita el aviso por defecto de Vite.
      chunkSizeWarningLimit: 1400,
    },
  },
});
