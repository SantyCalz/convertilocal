/**
 * src/tests/e2e/legal.spec.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.resolve('tests/fixtures', name);

/** Hosts externos autorizados: solo la publicidad de Google. */
const HOSTS_PERMITIDOS = [
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'adtrafficquality.google',
  'www.google.com',
  'googlesyndication.com',
  'doubleclick.net',
  'google.com',
  // Telemetría de AdSense (CSI). La carga el propio anuncio de Google.
  'csi.gstatic.com',
  'gstatic.com',
];

const PAGINAS_LEGALES = [
  { path: '/licencias', titulo: 'Licencias y atribuciones' },
  { path: '/terminos', titulo: 'Términos de uso' },
  { path: '/privacidad', titulo: 'Política de privacidad' },
];

/**
 * Origen público esperado. Lo define `PUBLIC_SITE_URL` y debe coincidir con
 * las canónicas, el sitemap y `robots.txt`.
 */
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://convertilocal.vercel.app')
  .trim()
  .replace(/\/$/, '');

for (const pagina of PAGINAS_LEGALES) {
  test(`${pagina.path} responde 200 y es indexable`, async ({ page }) => {
    const response = await page.goto(pagina.path);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(new RegExp(pagina.titulo, 'i'));

    // Indexable: sin noindex y con canonical propio.
    const html = await page.content();
    expect(html).not.toContain('noindex');
    expect(html).toContain(`rel="canonical" href="${SITE_URL}${pagina.path}"`);

    // Metadatos SEO presentes.
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
  });
}

test('las páginas legales enlazan con la licencia y el código fuente', async ({ page }) => {
  await page.goto('/licencias');

  await expect(page.locator('a[href="/licencias/gpl-2.0.txt"]')).toHaveCount(0);
  await expect(page.locator('a', { hasText: 'AGPL-3.0' }).first()).toBeVisible();
  await expect(page.locator('a[href*="github.com/SantyCalz/convertilocal"]').first()).toBeVisible();

  // El inventario de terceros se puede descargar en texto plano.
  const response = await page.request.get('/licencias/terceros.txt');
  expect(response.status()).toBe(200);
  const texto = await response.text();
  expect(texto).toContain('@imgly/background-removal');
  expect(texto).toContain('AGPL-3.0');
  expect(texto).toContain('GPL-2.0-or-later');

  // Manifiesto del código fuente de FFmpeg.
  const manifiesto = await page.request.get('/licencias/ffmpeg-fuente.txt');
  expect(manifiesto.status()).toBe(200);
  expect(await manifiesto.text()).toContain('ffmpegwasm/ffmpeg.wasm');
});

test('/licencias enlaza con el release del código fuente de FFmpeg y Ghostscript', async ({
  page,
}) => {
  await page.goto('/licencias');

  const enlace = page.locator('a[href*="/releases/tag/corresponding-source-"]').first();
  await expect(enlace).toBeVisible();

  const url = await enlace.getAttribute('href');
  expect(url).toMatch(
    /^https:\/\/github\.com\/SantyCalz\/convertilocal\/releases\/tag\/corresponding-source-/,
  );

  // El release y sus tarball deben ser accesibles sin autenticación.
  const release = await page.request.get(url!);
  expect(release.status()).toBe(200);

  const base = url!.replace(/\/tag\/(.*)$/, '');
  const tag = url!.match(/\/tag\/(.*)$/)![1];

  for (const asset of [
    'SOURCES.json',
    'ffmpeg-n5.1.4.tar.gz',
    'x264-4-cores.tar.gz',
    'x265-3.4.tar.gz',
    'ghostscript-9.56.0.tar.xz',
  ]) {
    const respuesta = await page.request.head(`${base}/download/${tag}/${asset}`);
    expect(respuesta.status(), `${asset} debe ser descargable`).toBe(200);
  }
});

test('el pie de página legal aparece en todas las páginas', async ({ page }) => {
  await page.goto('/');

  const pie = page.locator('footer');
  await expect(pie.locator('nav[aria-label="Legal"] a[href="/licencias"]')).toBeVisible();
  await expect(pie.locator('nav[aria-label="Legal"] a[href="/privacidad"]')).toBeVisible();
  await expect(pie.locator('nav[aria-label="Legal"] a[href="/terminos"]')).toBeVisible();
  await expect(pie.getByText('AGPL-3.0').first()).toBeVisible();

  // Navegación accesible de la columna Legal.
  await expect(page.locator('nav[aria-label="Legal"]')).toBeVisible();

  // Objetivos táctiles de al menos 44 px en los enlaces legales.
  const altura = await page
    .locator('nav[aria-label="Legal"] a')
    .first()
    .evaluate((node) => node.getBoundingClientRect().height);
  expect(altura).toBeGreaterThanOrEqual(44);
});

test('las rutas antiguas de lo legal redirigen a las nuevas', async ({ page }) => {
  await page.goto('/politica-de-privacidad');
  await expect(page).toHaveURL(/\/privacidad$/);

  await page.goto('/terminos-y-condiciones');
  await expect(page).toHaveURL(/\/terminos$/);
});

test('eliminar fondo no pide nada a CDNs externos', async ({ page }) => {
  const externas: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('blob:')) {
      externas.push(url);
    }
  });

  await page.goto('/imagenes/eliminar-fondo');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(/^Listo:/, { timeout: 300000 });

  const noAutorizadas = externas.filter((url) => {
    try {
      const host = new URL(url).host;
      return !HOSTS_PERMITIDOS.some((permitido) => host.endsWith(permitido));
    } catch {
      return true;
    }
  });

  expect(noAutorizadas, `Peticiones a hosts no autorizados:\n${noAutorizadas.join('\n')}`).toEqual([]);
  expect(externas.join('\n')).not.toContain('staticimgly.com');
});

test('convertir audio no pide nada a CDNs externos', async ({ page }) => {
  const externas: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('blob:')) {
      externas.push(url);
    }
  });

  await page.goto('/convertir/mp3-a-wav');
  await page.setInputFiles('input[type="file"]', fixture('sample.mp3'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(/^Listo:/, { timeout: 300000 });

  const noAutorizadas = externas.filter((url) => {
    try {
      const host = new URL(url).host;
      return !HOSTS_PERMITIDOS.some((permitido) => host.endsWith(permitido));
    } catch {
      return true;
    }
  });

  expect(noAutorizadas, `Peticiones a hosts no autorizados:\n${noAutorizadas.join('\n')}`).toEqual([]);
  expect(externas.join('\n')).not.toContain('unpkg.com');
});

test('las páginas legales no cargan JavaScript adicional propio', async ({ page }) => {
  const scripts: string[] = [];

  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });

  await page.goto('/licencias');
  await page.waitForLoadState('networkidle');

  // Ningún script debe salir del propio dominio salvo la publicidad autorizada.
  const externos = scripts.filter((url) => !url.startsWith('http://localhost'));
  const noAutorizados = externos.filter((url) => {
    try {
      const host = new URL(url).host;
      return !HOSTS_PERMITIDOS.some((permitido) => host.endsWith(permitido));
    } catch {
      return true;
    }
  });

  expect(noAutorizados, `Scripts externos en una página legal:\n${noAutorizados.join('\n')}`).toEqual([]);
});
