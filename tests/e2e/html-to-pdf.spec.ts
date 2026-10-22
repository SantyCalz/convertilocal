/**
 * tests/e2e/html-to-pdf.spec.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const PROCESSED = /^Listo:/;

/** HTML de prueba con contenido activo y recursos externos. */
const HTML_PELIGROSO = `<!doctype html>
<html>
  <head>
    <title>Documento de prueba</title>
    <style>
      @import url('https://cdn.example.com/estilos.css');
      body { font-family: sans-serif; color: #123456; }
      .destacado { background: url('https://cdn.example.com/fondo.png'); }
    </style>
    <script>window.__scriptEjecutado = true;</script>
  </head>
  <body>
    <h1 class="destacado">Título de prueba</h1>
    <p>Párrafo con <strong>negrita</strong> y un <a href="https://enlace-externo.example.com/">enlace</a>.</p>
    <img src="https://imagen-externa.example.com/logo.png" alt="logo externo">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="logo embebido">
    <script>window.__scriptEjecutado2 = true;</script>
  </body>
</html>`;

const HOSTS_PERMITIDOS = [
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'adtrafficquality.google',
  'googlesyndication.com',
  'doubleclick.net',
  'google.com',
];

test.beforeEach(async ({ page }) => {
  // Intercepta el flujo de impresión: el evento es cancelable, así que el
  // diálogo real no se abre y el test puede comprobar lo que se ha impreso.
  await page.addInitScript(() => {
    const w = window as never as {
      __impresiones: unknown[];
      addEventListener: (name: string, handler: (event: Event) => void) => void;
    };
    w.__impresiones = [];
    w.addEventListener('convertilocal:print', (event) => {
      const detail = (event as CustomEvent<{ mode: string; title: string }>).detail;
      w.__impresiones.push(detail);
      event.preventDefault();
    });
  });
});

test('el HTML pegado no ejecuta los scripts', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');
  await page.fill('[data-html-source]', HTML_PELIGROSO);
  await page.click('[data-html-use]');

  // El archivo se añade a la lista del procesador.
  await expect(page.locator('[data-fp-file-item]')).toHaveCount(1);

  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 120000 });

  const executed = await page.evaluate(() => {
    const w = window as never as Record<string, unknown>;
    return {
      principal: Boolean(w.__scriptEjecutado || w.__scriptEjecutado2),
      iframes: [...document.querySelectorAll('iframe')].map((frame) => {
        try {
          const inner = frame.contentWindow as never as Record<string, unknown>;
          return Boolean(inner.__scriptEjecutado || inner.__scriptEjecutado2);
        } catch {
          return false;
        }
      }),
    };
  });

  expect(executed.principal).toBe(false);
  expect(executed.iframes.every((value) => value === false)).toBe(true);
});

test('la conversión no hace peticiones a hosts externos', async ({ page }) => {
  const externas: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('blob:') && !url.startsWith('data:')) {
      externas.push(url);
    }
  });

  await page.goto('/convertir/html-a-pdf');
  await page.fill('[data-html-source]', HTML_PELIGROSO);
  await page.click('[data-html-use]');
  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 120000 });

  const noAutorizadas = externas.filter((url) => {
    try {
      const host = new URL(url).host;
      return !HOSTS_PERMITIDOS.some((permitido) => host.endsWith(permitido));
    } catch {
      return true;
    }
  });

  expect(noAutorizadas, `Peticiones a hosts no autorizados:\n${noAutorizadas.join('\n')}`).toEqual([]);
  // Ninguna referencia a los hosts de ejemplo debe llegar a salir.
  expect(externas.join('\n')).not.toContain('example.com');
});

test('el modo vectorial lanza el flujo de impresión del navegador', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');
  await page.fill('[data-html-source]', '<h1>Hola</h1><p>Mundo</p>');
  await page.click('[data-html-use]');
  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 120000 });

  const impresiones = await page.evaluate(
    () => (window as never as Record<string, unknown>).__impresiones as unknown[],
  );

  expect(impresiones.length).toBe(1);
  expect((impresiones[0] as { mode: string }).mode).toBe('vector');
});

test('el HTML saneado conserva el contenido y quita lo peligroso', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');
  await page.fill('[data-html-source]', HTML_PELIGROSO);
  await page.click('[data-html-use]');
  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 120000 });

  // El HTML saneado se descarga junto al resultado.
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.locator('[data-fp-action]').click();
  const download = await downloadPromise;
  const bytes = fs.readFileSync((await download.path())!);
  const html = bytes.toString('utf8');

  expect(html).toContain('Título de prueba');
  expect(html).toContain('negrita');
  // El contenido activo desaparece.
  expect(html).not.toContain('<script');
  expect(html).not.toContain('__scriptEjecutado');
  // Las URL externas desaparecen.
  expect(html).not.toContain('example.com');
  expect(html).not.toContain('@import');
  // Las imágenes embebidas se conservan.
  expect(html).toContain('data:image/png;base64');
});

test('el modo de compatibilidad descarga un PDF', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');
  await page.selectOption('select[data-fp-option="mode"]', 'raster');
  await page.fill('[data-html-source]', '<h1>Documento</h1><p>Contenido para el PDF.</p>');
  await page.click('[data-html-use]');

  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 180000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.locator('[data-fp-action]').click();
  const download = await downloadPromise;
  const bytes = fs.readFileSync((await download.path())!);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
});

test('el aviso de compatibilidad aparece en el modo rasterizado', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');
  await page.selectOption('select[data-fp-option="mode"]', 'raster');
  await page.fill('[data-html-source]', '<h1>Documento</h1>');
  await page.click('[data-html-use]');
  await page.locator('[data-fp-action]').click();

  await expect(page.locator('[data-fp-status]')).toContainText(/no será seleccionable/i, {
    timeout: 180000,
  });
});

test('la página incluye el bloque publicitario y los límites arriba', async ({ page }) => {
  await page.goto('/convertir/html-a-pdf');

  await expect(page.locator('[data-ad-slot]')).toBeVisible();
  const limits = page.locator('section[aria-label="Qué hace y qué no hace"]');
  await expect(limits).toBeVisible();
  await expect(limits).toContainText('No ejecuta JavaScript');
});
