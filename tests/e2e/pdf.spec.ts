import { test, expect } from '@playwright/test';
import { fixture, processAndDownload } from './helpers';

test('unir PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/unir-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf'), fixture('sample2.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(100);
});

test('dividir PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/dividir-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});

test('rotar PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/rotar-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});

test('numerar PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/numerar-paginas-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});

test('marca de agua PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/marca-de-agua-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});

test('comprimir PDF genera un PDF válido', async ({ page }) => {
  await page.goto('/pdf/comprimir-pdf');
  const { bytes } = await processAndDownload(page, [fixture('sample.pdf')]);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});
