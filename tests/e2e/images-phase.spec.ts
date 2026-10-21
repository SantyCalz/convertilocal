import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fixture, processAndDownload, PROCESSED } from './helpers';

/** Procesa la página y devuelve los bytes del PNG descargado. */
async function downloadPng(page: import('@playwright/test').Page): Promise<Buffer> {
  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 150000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  return fs.readFileSync((await download.path())!);
}

test('redimensionar imagen genera una imagen', async ({ page }) => {
  await page.goto('/imagenes/redimensionar');
  const { bytes } = await processAndDownload(page, [fixture('sample.png')]);
  expect(bytes.length).toBeGreaterThan(100);
});

test('redimensionar imagen respeta el ancho y el alto indicados', async ({ page }) => {
  await page.goto('/imagenes/redimensionar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '32');
  await page.fill('input[data-fp-option="height"]', '24');
  await page.selectOption('select[data-fp-option="format"]', 'png');

  const bytes = await downloadPng(page);

  // Firma PNG +IHDR con las dimensiones esperadas.
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(32);
  expect(bytes.readUInt32BE(20)).toBe(24);
});

test('redimensionar calcula el alto por proporción cuando se deja a 0', async ({ page }) => {
  await page.goto('/imagenes/redimensionar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '32');
  await page.fill('input[data-fp-option="height"]', '0');
  await page.selectOption('select[data-fp-option="format"]', 'png');

  const bytes = await downloadPng(page);

  // La fixture es cuadrada, así que el alto derivado también es 32.
  expect(bytes.readUInt32BE(16)).toBe(32);
  expect(bytes.readUInt32BE(20)).toBe(32);
});

test('redimensionar nunca amplía una imagen pequeña', async ({ page }) => {
  await page.goto('/imagenes/redimensionar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '512');
  await page.fill('input[data-fp-option="height"]', '0');
  await page.selectOption('select[data-fp-option="format"]', 'png');

  const bytes = await downloadPng(page);

  // Se conserva el tamaño original de 64x64 en lugar de estirar los píxeles.
  expect(bytes.readUInt32BE(16)).toBe(64);
  expect(bytes.readUInt32BE(20)).toBe(64);
});

test('redimensionar muestra la comparación antes y después', async ({ page }) => {
  await page.goto('/imagenes/redimensionar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '32');
  await page.fill('input[data-fp-option="height"]', '32');

  await downloadPng(page);

  const compare = page.locator('[data-image-compare]');
  await expect(compare).toBeVisible();
  await expect(compare.locator('[data-compare-before]')).toHaveAttribute('src', /^blob:/);
  await expect(compare.locator('[data-compare-after]')).toHaveAttribute('src', /^blob:/);
});

test('recortar imagen genera una imagen', async ({ page }) => {
  await page.goto('/imagenes/recortar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '32');
  await page.fill('input[data-fp-option="height"]', '32');
  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 150000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const bytes = fs.readFileSync(downloadPath!);
  expect(bytes.length).toBeGreaterThan(100);
});

test('recortar imagen con ancho 0 recorta hasta el borde', async ({ page }) => {
  await page.goto('/imagenes/recortar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="width"]', '0');
  await page.fill('input[data-fp-option="height"]', '0');
  await page.selectOption('select[data-fp-option="format"]', 'png');

  const bytes = await downloadPng(page);

  // La fixture mide 64x64, así que el recorte completo conserva ese tamaño.
  expect(bytes.readUInt32BE(16)).toBe(64);
  expect(bytes.readUInt32BE(20)).toBe(64);
});

test('recortar fuera de los límites muestra un error', async ({ page }) => {
  await page.goto('/imagenes/recortar');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));
  await page.fill('input[data-fp-option="x"]', '40');
  await page.fill('input[data-fp-option="width"]', '200');

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(/fuera de los límites/i, {
    timeout: 150000,
  });
});
