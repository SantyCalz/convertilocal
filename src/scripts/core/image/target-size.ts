import type { OutputFormatId } from '@/types/image';
import { encodeBitmap, fitDimensions } from './canvas';

export interface CompressionOptions {
  format: OutputFormatId;
  quality?: number;
  background?: string;
  maxWidth?: number;
  maxHeight?: number;
  targetBytes?: number;
  allowDownscale?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  targetMet: boolean;
  targetBytes?: number;
}

/** Busca la mejor calidad que quepa en el peso objetivo, reduciendo dimensiones si hace falta. */
export async function compressBitmap(
  bitmap: ImageBitmap,
  options: CompressionOptions,
  onProgress?: (percent: number) => void,
): Promise<CompressionResult> {
  const format = options.format === 'avif' ? 'avif' : options.format === 'webp' ? 'webp' : 'jpg';

  if (!options.targetBytes) {
    const encoded = await encodeBitmap(bitmap, format, {
      quality: options.quality ?? 82,
      background: options.background,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
    });
    onProgress?.(100);
    return { blob: encoded.blob, width: encoded.width, height: encoded.height, targetMet: true };
  }

  const target = Math.max(2048, options.targetBytes);
  const initial = fitDimensions(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
  let width = initial.width;
  let height = initial.height;
  let bestBlob: Blob | null = null;
  let bestWidth = 0;
  let bestHeight = 0;
  let bestQuality = -1;
  let smallestBlob: Blob | null = null;
  let smallestWidth = 0;
  let smallestHeight = 0;
  let attempts = 0;
  const maxAttempts = format === 'avif' ? 5 : 7;
  const minQuality = format === 'avif' ? 18 : 22;
  const maxQuality = format === 'avif' ? 88 : 94;
  const rounds = options.allowDownscale === false ? 1 : 6;

  for (let round = 0; round < rounds; round += 1) {
    let low = minQuality;
    let high = maxQuality;
    let roundBlob: Blob | null = null;
    let roundWidth = 0;
    let roundHeight = 0;
    let roundQuality = -1;
    let roundSmallest: { blob: Blob; width: number; height: number } | null = null;

    for (let step = 0; step < maxAttempts; step += 1) {
      const quality = (low + high) / 2;
      const encoded = await encodeBitmap(bitmap, format, {
        quality,
        background: options.background,
        maxWidth: width,
        maxHeight: height,
      });
      attempts += 1;
      onProgress?.(Math.min(95, 8 + (attempts / (maxAttempts * rounds)) * 82));

      if (encoded.blob.size <= target) {
        roundBlob = encoded.blob;
        roundWidth = encoded.width;
        roundHeight = encoded.height;
        roundQuality = quality;
        low = quality;
      } else {
        high = quality;
      }

      if (!roundSmallest || encoded.blob.size < roundSmallest.blob.size) {
        roundSmallest = { blob: encoded.blob, width: encoded.width, height: encoded.height };
      }
    }

    if (roundBlob && roundQuality > bestQuality) {
      bestBlob = roundBlob;
      bestWidth = roundWidth;
      bestHeight = roundHeight;
      bestQuality = roundQuality;
    }

    if (bestBlob) break;

    if (
      roundSmallest &&
      (!smallestBlob || roundSmallest.blob.size < smallestBlob.size)
    ) {
      smallestBlob = roundSmallest.blob;
      smallestWidth = roundSmallest.width;
      smallestHeight = roundSmallest.height;
    }

    if (options.allowDownscale === false) break;

    const nextWidth = Math.round(width * 0.85);
    const nextHeight = Math.round(height * 0.85);
    if (nextWidth < 64 || nextHeight < 64) break;
    width = nextWidth;
    height = nextHeight;
  }

  onProgress?.(100);

  if (bestBlob) {
    return {
      blob: bestBlob,
      width: bestWidth,
      height: bestHeight,
      targetMet: true,
      targetBytes: target,
    };
  }

  if (smallestBlob) {
    return {
      blob: smallestBlob,
      width: smallestWidth,
      height: smallestHeight,
      targetMet: false,
      targetBytes: target,
    };
  }

  const fallback = await encodeBitmap(bitmap, format, {
    quality: minQuality,
    background: options.background,
    maxWidth: width,
    maxHeight: height,
  });

  return {
    blob: fallback.blob,
    width: fallback.width,
    height: fallback.height,
    targetMet: false,
    targetBytes: target,
  };
}
