/**
 * tests/e2e/pdfa.spec.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib';
import { fixture } from './helpers';

const PROCESSED = /^Listo:/i;

/** Hosts externos autorizados en todo el sitio (solo publicidad de Google). */
const HOSTS_PERMITIDOS = [
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'adtrafficquality.google',
  'googlesyndication.com',
  'doubleclick.net',
  'google.com',
  // Telemetría de AdSense (CSI).
  'csi.gstatic.com',
  'gstatic.com',
];

const esExterno = (url: string): boolean => {
  // Solo interesan las peticiones de red reales; `blob:` y `data:` se generan
  // en el propio navegador y no salen del dispositivo.
  if (!/^https?:/i.test(url)) return false;
  try {
    const { hostname } = new URL(url);
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
};

const esPermitido = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return HOSTS_PERMITIDOS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return true;
  }
};

test('la landing muestra la etiqueta de mejor esfuerzo y el botón de preparación', async ({
  page,
}) => {
  const response = await page.goto('/convertir/pdf-a-pdfa');
  expect(response?.status()).toBe(200);

  await expect(page.locator('h1')).toContainText(/PDF\/A/i);

  // Distintivo visual obligatorio.
  await expect(
    page.getByText('PDF/A-2b (Mejor esfuerzo, preservación digital no certificada)'),
  ).toBeVisible();

  // El botón de carga diferida está presente y no se ha descargado nada aún.
  await expect(page.locator('[data-gs-button]')).toBeVisible();
  await expect(page.locator('[data-gs-button]')).toContainText(/Preparar conversor/i);

  // El bloque «qué hace / qué no hace» está arriba del pliegue.
  await expect(page.getByText(/No certifica conformidad PDF\/A/i).first()).toBeVisible();
});

test('convierte un PDF a PDF/A-2b con OutputIntent y XMP y sin peticiones externas', async ({
  page,
}) => {
  test.setTimeout(300000);

  const externas: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (esExterno(url) && !esPermitido(url)) externas.push(url);
  });

  await page.goto('/convertir/pdf-a-pdfa');

  // 1. Preparar el conversor (descarga diferida de ≈16 MB).
  const preparar = page.locator('[data-gs-button]');
  await preparar.click();
  await expect(page.locator('[data-gs-status]')).toContainText(/preparado/i, { timeout: 180000 });

  // 2. Subir el PDF y convertir.
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(fixture('sample.pdf'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await expect(action).toContainText(/Convertir a PDF\/A/i);

  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 240000 });

  // 3. Descargar el resultado.
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('No se obtuvo ruta de descarga.');

  const bytes = fs.readFileSync(downloadPath);
  expect(bytes.length).toBeGreaterThan(100);

  // 4. Verificar el PDF/A con pdf-lib.
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });

  const outputIntents = doc.catalog.get(PDFName.of('OutputIntents'));
  expect(outputIntents, 'El PDF debe tener OutputIntents').toBeInstanceOf(PDFArray);

  const intents = outputIntents as PDFArray;
  expect(intents.size()).toBeGreaterThan(0);
  const intent = intents.lookup(0) as PDFDict;
  expect(intent.get(PDFName.of('S'))?.toString()).toBe('/GTS_PDFA1');

  const profile = intent.get(PDFName.of('DestOutputProfile'));
  expect(profile, 'El OutputIntent debe referenciar el perfil ICC').toBeDefined();

  const metadata = doc.catalog.get(PDFName.of('Metadata'));
  expect(metadata, 'El PDF debe tener metadatos XMP').toBeDefined();

  // 5. Sin peticiones a CDNs externos (salvo AdSense, que no se carga aquí).
  expect(externas, `Peticiones externas no autorizadas:\n${externas.join('\n')}`).toEqual([]);
});

test('el botón principal del procesador también prepara el conversor', async ({ page }) => {
  test.setTimeout(300000);

  await page.goto('/convertir/pdf-a-pdfa');

  const action = page.locator('[data-fp-action]');
  await expect(action).toContainText(/Preparar conversor/i);
  await action.click();

  await expect(page.locator('[data-fp-status]')).toContainText(/preparado/i, { timeout: 180000 });
  await expect(action).toContainText(/Convertir a PDF\/A/i);
});
