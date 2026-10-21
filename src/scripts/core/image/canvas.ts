/**
 * src/scripts/core/image/canvas.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import avifWasmUrl from '@jsquash/avif/codec/enc/avif_enc.wasm?url';
import type { OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { encodeBmp } from './bmp';
import { encodeIco, extractLargestIcoPng } from './ico';
import { mimeForOutput } from './output';
import { sniffImage } from './sniff';

export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
  icoSizes?: number[];
}

export function fitDimensions(
  width: number,
  height: number,
  maxWidth?: number,
  maxHeight?: number,
): { width: number; height: number } {
  const limitWidth = maxWidth && maxWidth > 0 ? maxWidth : width;
  const limitHeight = maxHeight && maxHeight > 0 ? maxHeight : height;
  const scale = Math.min(1, limitWidth / width, limitHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function decodeBitmap(blob: Blob): Promise<ImageBitmap> {
  const sniffed = await sniffImage(blob);
  if (sniffed?.format === 'ico') {
    const png = extractLargestIcoPng(await blob.arrayBuffer());
    if (png) {
      try {
        return await createImageBitmap(png);
      } catch {
        // Probamos con el ICO completo.
      }
    }
  }

  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(blob);
    } catch {
      const label = sniffed?.format ? sniffed.format.toUpperCase() : 'esta imagen';
      throw new ImageProcessingError(
        'DECODE_FAILED',
        `No pudimos leer ${label}. El archivo puede estar dañado o tu navegador no admite este formato.`,
      );
    }
  }
}

function parseBackground(value: string | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
}

function drawOnCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  background?: string,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageProcessingError('ENCODE_FAILED', 'No se pudo crear el lienzo de salida.');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (background) {
    context.fillStyle = parseBackground(background);
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

let avifReady: Promise<void> | null = null;

async function ensureAvifEncoder(): Promise<typeof import('@jsquash/avif/encode')> {
  const module = await import('@jsquash/avif/encode');
  if (!avifReady) {
    avifReady = module
      .init({
        locateFile: (path: string) => (path.endsWith('.wasm') ? avifWasmUrl : path),
      })
      .then(() => undefined)
      .catch((error) => {
        avifReady = null;
        throw error;
      });
  }
  await avifReady;
  return module;
}

async function encodeAvif(
  canvas: OffscreenCanvas,
  context: OffscreenCanvasRenderingContext2D,
  quality: number,
): Promise<Blob> {
  try {
    const { default: encode } = await ensureAvifEncoder();
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const buffer = await encode(imageData, {
      quality: Math.round(quality),
      speed: 8,
      subsample: 1,
    });
    return new Blob([buffer], { type: 'image/avif' });
  } catch (error) {
    console.error(error);
    throw new ImageProcessingError(
      'AVIF_FAILED',
      'No se pudo codificar el AVIF. Comprueba tu conexión la primera vez (el codificador se descarga aparte) e inténtalo de nuevo.',
    );
  }
}

/**
 * Codifica un lienzo ya pintado en el formato pedido.
 *
 * Es el punto único de salida para BMP, AVIF, ICO y los formatos que delega
 * en `convertToBlob`, de modo que redimensionar y recortar ofrezcan
 * exactamente los mismos formatos que convertir.
 */
export async function encodeCanvas(
  canvas: OffscreenCanvas,
  format: OutputFormatId,
  quality?: number,
): Promise<EncodedImage> {
  const width = canvas.width;
  const height = canvas.height;

  if (format === 'ico') {
    const { blob, sizes } = await encodeIco(canvas);
    return { blob, width, height, icoSizes: sizes };
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageProcessingError('ENCODE_FAILED', 'No se pudo preparar el lienzo de salida.');
  }

  const resolved = Math.min(100, Math.max(1, quality ?? (format === 'avif' ? 65 : 90)));

  try {
    if (format === 'bmp') {
      const data = context.getImageData(0, 0, width, height);
      return { blob: encodeBmp(data), width, height };
    }

    if (format === 'avif') {
      return { blob: await encodeAvif(canvas, context, resolved), width, height };
    }

    const blob = await canvas.convertToBlob({
      type: mimeForOutput(format),
      quality: resolved / 100,
    });
    return { blob, width, height };
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error;
    console.error(error);
    throw new ImageProcessingError(
      'ENCODE_FAILED',
      `No se pudo generar el archivo ${format.toUpperCase()} en este navegador.`,
    );
  }
}

export async function encodeBitmap(
  bitmap: ImageBitmap,
  format: OutputFormatId,
  options: { quality?: number; background?: string; maxWidth?: number; maxHeight?: number } = {},
): Promise<EncodedImage> {
  if (format === 'ico') {
    const { blob, sizes } = await encodeIco(bitmap);
    return { blob, width: bitmap.width, height: bitmap.height, icoSizes: sizes };
  }

  const { width, height } = fitDimensions(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
  const needsBackground = format === 'jpg' || format === 'bmp';
  const canvas = drawOnCanvas(bitmap, width, height, needsBackground ? options.background : undefined);

  return encodeCanvas(canvas, format, options.quality);
}
