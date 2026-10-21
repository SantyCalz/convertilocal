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

  // El original queda a la izquierda y el resultado a la derecha.
  const layer = compare.locator('[data-compare-after-layer]');
  await expect(layer).toHaveAttribute('style', /clip-path: inset\(0 0 0 50%\)/);

  // El deslizador mueve el recorte del «después».
  const slider = compare.locator('[data-compare-slider]');
  await slider.fill('25');
  const clip = await layer.evaluate((node) => (node as HTMLElement).style.clipPath);
  expect(clip).toContain('25%');
});

test('eliminar fondo muestra el entramado bajo el PNG transparente', async ({ page }) => {
  await page.goto('/imagenes/eliminar-fondo');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 300000 });

  const backdrop = page.locator('[data-compare-backdrop]');
  await expect(backdrop).toBeVisible();

  // El entramado ocupa exactamente el hueco de la imagen, no todo el escenario.
  const box = await backdrop.boundingBox();
  const stage = await page.locator('[data-compare-stage]').boundingBox();
  expect(box).not.toBeNull();
  expect(stage).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(stage!.width + 1);
  expect(box!.height).toBeLessThanOrEqual(stage!.height + 1);
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // Se pinta con el patrón ajedrezado, no con un color plano.
  const backgroundImage = await backdrop.evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(backgroundImage).toContain('linear-gradient');
});

test('eliminar fondo no alarma con el aumento de peso del PNG', async ({ page }) => {
  await page.goto('/imagenes/eliminar-fondo');
  await page.setInputFiles('input[type="file"]', fixture('sample.png'));

  const action = page.locator('[data-fp-action]');
  await expect(action).toBeEnabled({ timeout: 15000 });
  await action.click();
  await expect(page.locator('[data-fp-status]')).toContainText(PROCESSED, { timeout: 300000 });

  const badge = page.locator('[data-fp-savings]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('PNG transparente');
  await expect(badge).not.toContainText('% de peso');
});
