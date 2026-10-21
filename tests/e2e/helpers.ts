import { expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

export const fixture = (name: string) => path.resolve('tests/fixtures', name);

/**
 * El estado previo a procesar dice «1 archivo(s) listo(s)», así que hay que
 * anclar el patrón a «Listo:» para esperar de verdad al resultado.
 */
export const PROCESSED = /^Listo:/i;

export async function processAndDownload(page: any, files: string[]) {
  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error: any) => consoleErrors.push(error.message));

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
  const bytes = fs.readFileSync(downloadPath);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  return { download, bytes };
}
