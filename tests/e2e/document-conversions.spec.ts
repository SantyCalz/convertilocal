/**
 * tests/e2e/document-conversions.spec.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';

/** Abre el ZIP de salida y devuelve sus ficheros. */
function unzip(bytes: Buffer): Array<{ name: string; bytes: Buffer }> {
  const files = unzipSync(new Uint8Array(bytes));
  return Object.entries(files).map(([name, data]) => ({
    name,
    bytes: Buffer.from(data),
  }));
}

const fixture = (name: string) => path.resolve('tests/fixtures', name);
const PROCESSED = /^Listo:/;

/**
 * Abre el PDF con pdf-lib para contar páginas y medir la caja.
 *
 * No se puede contar a pelo: pdf-lib escribe los objetos en flujos comprimidos,
 * así que `/Type /Page` no aparece en claro en el binario.
 */
async function readPdf(bytes: Buffer) {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const page = document.getPage(0);
  const size = page.getSize();
  return { pageCount: document.getPageCount(), width: size.width, height: size.height };
}

async function processAndDownload(page: import('@playwright/test').Page, files: string[]) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(files);

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 150000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('No se obtuvo ruta de descarga.');
  return { download, bytes: fs.readFileSync(downloadPath) };
}

test('jpg a pdf genera un PDF con la imagen dentro', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.jpg')]);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pdf = await readPdf(bytes);
  expect(pdf.pageCount).toBe(1);
  expect(bytes.length).toBeGreaterThan(500);
});

test('png a pdf conserva la transparencia y genera un PDF', async ({ page }) => {
  await page.goto('/convertir/png-a-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.png')]);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pdf = await readPdf(bytes);
  expect(pdf.pageCount).toBe(1);
});

test('varias imágenes se unen en un solo PDF', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.jpg'), fixture('sample2.jpg')]);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pdf = await readPdf(bytes);
  expect(pdf.pageCount).toBe(2);
});

test('la página A4 respeta el tamaño y la orientación elegidas', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  await page.selectOption('select[data-fp-option="pageSize"]', 'a4');
  await page.selectOption('select[data-fp-option="orientation"]', 'portrait');
  await page.selectOption('select[data-fp-option="marginMm"]', '10');

  const { bytes } = await processAndDownload(page, [fixture('sample.jpg')]);
  const pdf = await readPdf(bytes);

  // A4 son 595,28 × 841,89 puntos.
  expect(pdf.width).toBeCloseTo(595.28, 1);
  expect(pdf.height).toBeCloseTo(841.89, 1);
});

test('la orientación automática sigue la forma de la imagen', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  await page.selectOption('select[data-fp-option="pageSize"]', 'a4');
  await page.selectOption('select[data-fp-option="orientation"]', 'auto');

  // La fixture es apaisada (80x60), así que la página A4 también.
  const { bytes } = await processAndDownload(page, [fixture('sample.jpg')]);
  const pdf = await readPdf(bytes);

  expect(pdf.width).toBeCloseTo(841.89, 1);
  expect(pdf.height).toBeCloseTo(595.28, 1);
});

test('el margen de 0 mm deja la imagen al borde', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  await page.selectOption('select[data-fp-option="pageSize"]', 'auto');
  await page.selectOption('select[data-fp-option="marginMm"]', '0');

  const { bytes } = await processAndDownload(page, [fixture('sample.jpg')]);
  const pdf = await readPdf(bytes);

  // Con tamaño automático la página sigue el tamaño de la imagen (80x60 px a
  // 96 ppp -> 60 x 45 puntos) y sin margen la imagen la ocupa entera.
  expect(pdf.width).toBeCloseTo(60, 0);
  expect(pdf.height).toBeCloseTo(45, 0);
});

test('pdf a jpg convierte las páginas en imágenes JPEG', async ({ page }) => {
  await page.goto('/convertir/pdf-a-jpg');
  const { download, bytes } = await processAndDownload(page, [fixture('sample.pdf')]);

  // El PDF de ejemplo tiene 2 páginas: se descargan juntas en un ZIP local.
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  expect(download.suggestedFilename()).toMatch(/\.zip$/);

  const entries = unzip(bytes);
  expect(entries.length).toBe(2);
  for (const entry of entries) {
    expect(entry.name).toMatch(/\.jpg$/);
    expect(entry.bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
  }
});

test('pdf a jpg con una sola página descarga el JPG suelto', async ({ page }) => {
  await page.goto('/convertir/pdf-a-jpg');
  await page.fill('input[data-fp-option="pages"]', '1');

  const { download, bytes } = await processAndDownload(page, [fixture('sample.pdf')]);

  expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
});

test('pdf a png convierte las páginas en imágenes PNG', async ({ page }) => {
  await page.goto('/convertir/pdf-a-png');
  const { download, bytes } = await processAndDownload(page, [fixture('sample.pdf')]);

  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  expect(download.suggestedFilename()).toMatch(/\.zip$/);

  const entries = unzip(bytes);
  expect(entries.length).toBe(2);
  for (const entry of entries) {
    expect(entry.name).toMatch(/\.png$/);
    expect(entry.bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  }
});

test('pdf a jpg respeta el rango de páginas elegido', async ({ page }) => {
  await page.goto('/convertir/pdf-a-jpg');
  await page.fill('input[data-fp-option="pages"]', '2');

  const { download } = await processAndDownload(page, [fixture('sample.pdf')]);

  // Solo la segunda página: el archivo no es un ZIP y su nombre lleva la 002.
  expect(download.suggestedFilename()).toMatch(/pagina-002\.jpg$/);
});

test('pdf a jpg avisa cuando el rango no existe', async ({ page }) => {
  await page.goto('/convertir/pdf-a-jpg');
  await page.fill('input[data-fp-option="pages"]', '9');

  await page.setInputFiles('input[type="file"]', fixture('sample.pdf'));
  await page.locator('[data-fp-action]').click();

  await expect(page.locator('[data-fp-status]')).toContainText(/fuera del documento/i, {
    timeout: 60000,
  });
});

test('la lista de imágenes permite reordenar con el asa', async ({ page }) => {
  await page.goto('/convertir/jpg-a-pdf');
  await page.setInputFiles('input[type="file"]', [
    fixture('sample.jpg'),
    fixture('sample2.jpg'),
  ]);

  const items = page.locator('[data-fp-file-item]');
  await expect(items).toHaveCount(2);

  const namesBefore = await items.allTextContents();

  // El asa es un botón: con el teclado se mueve con las flechas.
  const handle = page.locator('[data-fp-reorder-handle]').first();
  await expect(handle).toBeVisible();
  await handle.focus();
  await page.keyboard.press('ArrowDown');

  const namesAfter = await page.locator('[data-fp-file-item]').allTextContents();
  expect(namesAfter).not.toEqual(namesBefore);
  expect(namesAfter[0]).toContain('sample2.jpg');
  expect(namesAfter[1]).toContain('sample.jpg');
});

test('las páginas de documentos muestran qué hacen y qué no', async ({ page }) => {
  for (const path of ['/convertir/jpg-a-pdf', '/convertir/pdf-a-jpg']) {
    await page.goto(path);
    const limits = page.locator('section[aria-label="Qué hace y qué no hace"]');
    await expect(limits).toBeVisible();
    await expect(limits).toContainText('Qué hace');
    await expect(limits).toContainText('Qué no hace');
  }
});

test('las rutas antiguas de PDF a imagen están redireccionadas en Vercel', async () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const redirects = config.redirects ?? [];

  const jpg = redirects.find((item: { source: string }) => item.source === '/pdf/pdf-a-jpg');
  const png = redirects.find((item: { source: string }) => item.source === '/pdf/pdf-a-png');

  expect(jpg).toBeTruthy();
  expect(jpg.destination).toBe('/convertir/pdf-a-jpg');
  expect(jpg.permanent).toBe(true);

  expect(png).toBeTruthy();
  expect(png.destination).toBe('/convertir/pdf-a-png');
  expect(png.permanent).toBe(true);
});
