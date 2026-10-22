import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const fixture = (name: string) => path.resolve('tests/fixtures', name);
const PROCESSED = /^Listo:/;

async function processAndDownload(page: import('@playwright/test').Page, files: string[]) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(files);
  // Aseguramos que el evento change se dispare: en algunos casos setInputFiles
  // no lo emite automáticamente y el botón no se habilita.
  await input.dispatchEvent('change');

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 180000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('No se obtuvo ruta de descarga.');
  return { download, bytes: fs.readFileSync(downloadPath) };
}

test('word a pdf genera un PDF con el texto del documento', async ({ page }) => {
  await page.goto('/convertir/word-a-pdf');
  await page.selectOption('select[data-fp-option="mode"]', 'raster');
  const { bytes } = await processAndDownload(page, [fixture('sample.docx')]);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
});

test('word a pdf en modo vectorial descarga el HTML saneado', async ({ page }) => {
  await page.goto('/convertir/word-a-pdf');
  const { download, bytes } = await processAndDownload(page, [fixture('sample.docx')]);

  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const html = bytes.toString('utf8');
  expect(html).toContain('Título de prueba');
  expect(html).toContain('con negrita');
  expect(html).not.toContain('<script');
});

test('word a pdf en modo rasterizado descarga un PDF', async ({ page }) => {
  await page.goto('/convertir/word-a-pdf');
  await page.selectOption('select[data-fp-option="mode"]', 'raster');
  await page.setInputFiles('input[type="file"]', fixture('sample.docx'));
  await page.locator('input[type="file"]').first().dispatchEvent('change');

  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 180000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.locator('[data-fp-action]').click();
  const download = await downloadPromise;
  const bytes = fs.readFileSync((await download.path())!);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
});

test('word a pdf rechaza archivos .doc antiguos', async ({ page }) => {
  // Creamos un .doc falso (el procesador solo mira la extensión).
  const fakeDoc = path.resolve('tests/fixtures', 'sample.doc');
  fs.writeFileSync(fakeDoc, 'no es un docx');

  await page.goto('/convertir/word-a-pdf');
  await page.setInputFiles('input[type="file"]', fakeDoc);
  await page.locator('input[type="file"]').first().dispatchEvent('change');

  await expect(page.locator('[data-fp-status]')).toContainText(
    /Formato no compatible.*esta herramienta acepta DOCX/i,
    { timeout: 30000 },
  );

  fs.unlinkSync(fakeDoc);
});

test('word a pdf muestra el aviso de conversión aproximada', async ({ page }) => {
  await page.goto('/convertir/word-a-pdf');
  await page.setInputFiles('input[type="file"]', fixture('sample.docx'));
  await page.locator('input[type="file"]').first().dispatchEvent('change');

  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 180000 });

  const status = await page.locator('[data-fp-status]').textContent();
  expect(status).toMatch(/aproximada|columnas complejas/i);
});

test('excel a pdf genera un PDF con las hojas como tablas', async ({ page }) => {
  await page.goto('/convertir/excel-a-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.xlsx')]);

  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
});

test('excel a pdf avisa de la extracción tabular', async ({ page }) => {
  await page.goto('/convertir/excel-a-pdf');
  await page.setInputFiles('input[type="file"]', fixture('sample.xlsx'));
  await page.locator('input[type="file"]').first().dispatchEvent('change');

  await page.locator('[data-fp-action]').click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 180000 });

  const status = await page.locator('[data-fp-status]').textContent();
  expect(status).toMatch(/Extracción de datos en tablas/i);
});

test('excel a pdf pone las hojas anchas en apaisado', async ({ page }) => {
  await page.goto('/convertir/excel-a-pdf');
  await page.selectOption('select[data-fp-option="orientation"]', 'auto');

  const { bytes } = await processAndDownload(page, [fixture('sample.xlsx')]);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const size = pdf.getPage(0).getSize();

  // La hoja de ejemplo tiene 3 columnas: vertical.
  expect(size.width).toBeLessThan(size.height);
});

test('excel a pdf con orientación forzada horizontal', async ({ page }) => {
  await page.goto('/convertir/excel-a-pdf');
  await page.selectOption('select[data-fp-option="orientation"]', 'landscape');

  const { bytes } = await processAndDownload(page, [fixture('sample.xlsx')]);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const size = pdf.getPage(0).getSize();

  expect(size.width).toBeGreaterThan(size.height);
});

test('las páginas de documentos muestran qué hacen y qué no', async ({ page }) => {
  for (const path of ['/convertir/word-a-pdf', '/convertir/excel-a-pdf']) {
    await page.goto(path);
    const limits = page.locator('section[aria-label="Qué hace y qué no hace"]');
    await expect(limits).toBeVisible();
    await expect(limits).toContainText('Qué hace');
    await expect(limits).toContainText('Qué no hace');
  }
});
