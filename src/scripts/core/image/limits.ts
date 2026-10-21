/**
 * src/scripts/core/image/limits.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ImageProcessingError } from '@/types/image';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_SIDE = 16_384;
export const MAX_PIXELS = 80_000_000;

export function assertBitmapSize(width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new ImageProcessingError('DECODE_FAILED', 'La imagen no tiene unas dimensiones válidas.');
  }
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new ImageProcessingError(
      'TOO_LARGE',
      'La imagen es demasiado grande para procesarla con seguridad. Prueba con una copia de menor resolución.',
    );
  }
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
