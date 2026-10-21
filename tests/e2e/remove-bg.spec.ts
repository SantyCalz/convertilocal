import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fixture, PROCESSED } from './helpers';

test('eliminar fondo genera un PNG transparente', async ({ page }) => {
  await page.goto('/imagenes/eliminar-fondo');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });

  // La primera ejecución descarga el modelo de segmentación (42 MB).
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 300000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await action.click();
  const download = await downloadPromise;
  const path = await download.path();
  const bytes = fs.readFileSync(path!);

  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});

test('eliminar fondo muestra la comparación antes y después', async ({ page }) => {
  await page.goto('/imagenes/eliminar-fondo');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 300000 });

  const compare = page.locator('[data-image-compare]');
  await expect(compare).toBeVisible();
  await expect(compare.locator('[data-compare-before]')).toHaveAttribute('src', /^blob:/);
  await expect(compare.locator('[data-compare-after]')).toHaveAttribute('src', /^blob:/);

  // El deslizador mueve la posición del recorte del «después».
  const slider = compare.locator('[data-compare-slider]');
  await slider.fill('25');
  const clip = await compare.locator('[data-compare-after]').evaluate(
    (node) => (node as HTMLElement).style.clipPath,
  );
  expect(clip).toContain('75%');
});
