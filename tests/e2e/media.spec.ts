import { test, expect } from '@playwright/test';
import { fixture, processAndDownload } from './helpers';

test('cortar audio genera un archivo de audio', async ({ page }) => {
  await page.goto('/media/cortar-audio');
  const { bytes } = await processAndDownload(page, [fixture('sample.mp3')]);
  expect(bytes.length).toBeGreaterThan(100);
  const isMp3 = bytes[0] === 0xff || bytes.toString('ascii', 0, 3) === 'ID3';
  expect(isMp3).toBeTruthy();
});

test('extraer audio de MP4 genera un MP3', async ({ page }) => {
  await page.goto('/convertir/mp4-a-mp3');
  const { bytes } = await processAndDownload(page, [fixture('sample.mp4')]);
  expect(bytes.length).toBeGreaterThan(100);
  const isMp3 = bytes[0] === 0xff || bytes.toString('ascii', 0, 3) === 'ID3';
  expect(isMp3).toBeTruthy();
});

test('convertir MP4 a GIF genera un GIF', async ({ page }) => {
  await page.goto('/convertir/mp4-a-gif');
  const { bytes } = await processAndDownload(page, [fixture('sample.mp4')]);
  expect(bytes.toString('ascii', 0, 6)).toMatch(/^GIF8[79]a$/);
});

test('cortar video genera un MP4', async ({ page }) => {
  await page.goto('/media/cortar-video');
  const { bytes } = await processAndDownload(page, [fixture('sample.mp4')]);
  expect(bytes.toString('ascii', 4, 8)).toBe('ftyp');
});
