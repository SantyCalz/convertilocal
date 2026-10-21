import type {
  ImageJobOptions,
  ImageJobResult,
  ImageResultMeta,
  OutputFormatId,
} from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { decodeBitmap, encodeBitmap, encodeCanvas } from './canvas';
import { assertBitmapSize } from './limits';
import { bytesToBlob, stripImageMetadata } from './metadata';
import { mimeForOutput } from './output';
import { sniffImage } from './sniff';
import { compressBitmap } from './target-size';

const OUTPUT_FORMATS: OutputFormatId[] = ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'];
const CLEANABLE = new Set(['jpg', 'png', 'webp']);

function normalizeOutput(value: unknown): OutputFormatId {
  return OUTPUT_FORMATS.includes(value as OutputFormatId) ? (value as OutputFormatId) : 'png';
}

function metaFor(
  format: OutputFormatId,
  width: number,
  height: number,
  blob: Blob,
): ImageResultMeta {
  return { format, width, height, bytes: blob.size };
}

export async function convertFile(
  file: File,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', 'El archivo está vacío.');

  const sniffed = await sniffImage(file);
  if (!sniffed) {
    throw new ImageProcessingError(
      'UNKNOWN_FORMAT',
      'No reconocemos el formato real de este archivo. Puede estar dañado o tener la extensión cambiada.',
    );
  }
  if (sniffed.format === 'heic') {
    throw new ImageProcessingError(
      'UNSUPPORTED_INPUT',
      'Este archivo es HEIC. Usa la herramienta específica de HEIC a JPG o PNG.',
    );
  }

  const format = normalizeOutput(options.format);
  onProgress?.(10);
  const bitmap = await decodeBitmap(file);
  assertBitmapSize(bitmap.width, bitmap.height);

  try {
    onProgress?.(35);
    const encoded = await encodeBitmap(bitmap, format, {
      quality: options.quality,
      background: options.background,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
    });
    onProgress?.(100);
    const meta = metaFor(format, encoded.width, encoded.height, encoded.blob);
    if (encoded.icoSizes) meta.icoSizes = encoded.icoSizes;
    return { blob: encoded.blob, meta };
  } finally {
    bitmap.close();
  }
}

export async function compressFile(
  file: File,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', 'El archivo está vacío.');

  const sniffed = await sniffImage(file);
  if (!sniffed) {
    throw new ImageProcessingError('UNKNOWN_FORMAT', 'No reconocemos el formato real de este archivo.');
  }
  if (sniffed.format === 'heic') {
    throw new ImageProcessingError(
      'UNSUPPORTED_INPUT',
      'Convierte primero el HEIC a JPG o PNG y después ajusta el peso.',
    );
  }

  const format = normalizeOutput(options.format);
  if (!['jpg', 'webp', 'avif'].includes(format)) {
    throw new ImageProcessingError(
      'UNSUPPORTED_OUTPUT',
      'La compresión a peso objetivo necesita un formato con pérdida: JPG, WebP o AVIF.',
    );
  }

  onProgress?.(5);
  const bitmap = await decodeBitmap(file);
  assertBitmapSize(bitmap.width, bitmap.height);

  try {
    const targetKb = Number(options.targetKb);
    const targetBytes =
      options.mode === 'target' && Number.isFinite(targetKb)
        ? Math.round(Math.min(10_240, Math.max(5, targetKb)) * 1024)
        : undefined;

    const result = await compressBitmap(
      bitmap,
      {
        format,
        quality: options.quality,
        background: options.background,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        targetBytes,
        allowDownscale: options.allowDownscale !== false,
      },
      onProgress,
    );

    const meta = metaFor(format, result.width, result.height, result.blob);
    if (targetBytes) {
      meta.targetMet = result.targetMet;
      meta.targetBytes = targetBytes;
    }
    return { blob: result.blob, meta };
  } finally {
    bitmap.close();
  }
}

export async function cleanFile(
  file: File,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', 'El archivo está vacío.');

  const sniffed = await sniffImage(file);
  if (!sniffed) {
    throw new ImageProcessingError('UNKNOWN_FORMAT', 'No reconocemos el formato real de este archivo.');
  }
  if (!CLEANABLE.has(sniffed.format)) {
    throw new ImageProcessingError(
      'UNSUPPORTED_INPUT',
      'La limpieza de metadatos está disponible para JPG, PNG y WebP.',
    );
  }

  onProgress?.(15);
  const buffer = await file.arrayBuffer();
  const stripped = stripImageMetadata(buffer, sniffed.format);
  const format = sniffed.format as OutputFormatId;
  const shouldFix = options.fixOrientation !== false && stripped.orientation > 1;

  if (!shouldFix) {
    onProgress?.(100);
    const blob = stripped.removed
      ? bytesToBlob(stripped.bytes, mimeForOutput(format))
      : new Blob([buffer], { type: mimeForOutput(format) });
    const meta = metaFor(format, 0, 0, blob);
    meta.removedMetadata = stripped.removed;
    meta.orientation = stripped.orientation;
    return { blob, meta };
  }

  onProgress?.(40);
  const bitmap = await decodeBitmap(file);
  assertBitmapSize(bitmap.width, bitmap.height);

  try {
    const encoded = await encodeBitmap(bitmap, format, {
      quality: 95,
      background: '#ffffff',
    });
    onProgress?.(100);
    const meta = metaFor(format, encoded.width, encoded.height, encoded.blob);
    meta.removedMetadata = true;
    meta.orientation = stripped.orientation;
    return { blob: encoded.blob, meta };
  } finally {
    bitmap.close();
  }
}
export async function resizeFile(
  file: File,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', 'El archivo está vacío.');

  const sniffed = await sniffImage(file);
  if (!sniffed) throw new ImageProcessingError('UNKNOWN_FORMAT', 'No reconocemos el formato real de este archivo.');
  if (sniffed.format === 'heic') throw new ImageProcessingError('UNSUPPORTED_INPUT', 'Convierte primero el HEIC a JPG o PNG.');

  const format = normalizeOutput(options.format);
  onProgress?.(10);
  const bitmap = await decodeBitmap(file);
  assertBitmapSize(bitmap.width, bitmap.height);

  try {
    onProgress?.(35);
    const requestedWidth = Math.round(Number(options.maxWidth || options.width || 0));
    const requestedHeight = Math.round(Number(options.maxHeight || options.height || 0));

    // Una dimensión a 0 significa «la que toque por proporción» o «la original».
    let targetWidth = requestedWidth;
    let targetHeight = requestedHeight;

    if (targetWidth <= 0 && targetHeight <= 0) {
      targetWidth = bitmap.width;
      targetHeight = bitmap.height;
    } else if (targetWidth <= 0) {
      targetWidth = Math.max(1, Math.round((targetHeight * bitmap.width) / bitmap.height));
    } else if (targetHeight <= 0) {
      targetHeight = Math.max(1, Math.round((targetWidth * bitmap.height) / bitmap.width));
    }

    const fit = options.fit === 'cover' || options.fit === 'stretch' ? options.fit : 'contain';
    const containScale = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height);

    // Redimensionar nunca amplía: si la caja destino es mayor que la original
    // se conserva el tamaño de partida en lugar de estirar los píxeles.
    if (fit === 'contain' && containScale >= 1) {
      targetWidth = bitmap.width;
      targetHeight = bitmap.height;
    }

    let drawWidth = bitmap.width;
    let drawHeight = bitmap.height;
    let offsetX = 0;
    let offsetY = 0;

    if (fit === 'stretch') {
      drawWidth = targetWidth;
      drawHeight = targetHeight;
    } else {
      const scale = fit === 'cover'
        ? Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height)
        : Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height);
      drawWidth = Math.max(1, Math.round(bitmap.width * scale));
      drawHeight = Math.max(1, Math.round(bitmap.height * scale));
      offsetX = Math.round((targetWidth - drawWidth) / 2);
      offsetY = Math.round((targetHeight - drawHeight) / 2);
    }

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const context = canvas.getContext('2d');
    if (!context) throw new ImageProcessingError('ENCODE_FAILED', 'No se pudo crear el lienzo de salida.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    // Solo los formatos sin canal alfa necesitan un color de fondo plano.
    if (options.background && (format === 'jpg' || format === 'bmp')) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, targetWidth, targetHeight);
    }
    context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);

    const encoded = await encodeCanvas(canvas, format, options.quality);
    onProgress?.(100);
    const meta = metaFor(format, encoded.width, encoded.height, encoded.blob);
    if (encoded.icoSizes) meta.icoSizes = encoded.icoSizes;
    return { blob: encoded.blob, meta };
  } finally {
    bitmap.close();
  }
}

export async function cropFile(
  file: File,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', 'El archivo está vacío.');

  const sniffed = await sniffImage(file);
  if (!sniffed) throw new ImageProcessingError('UNKNOWN_FORMAT', 'No reconocemos el formato real de este archivo.');
  if (sniffed.format === 'heic') throw new ImageProcessingError('UNSUPPORTED_INPUT', 'Convierte primero el HEIC a JPG o PNG.');

  const format = normalizeOutput(options.format);
  onProgress?.(10);
  const bitmap = await decodeBitmap(file);
  assertBitmapSize(bitmap.width, bitmap.height);

  try {
    const x = Math.max(0, Math.round(Number(options.cropX ?? 0)));
    const y = Math.max(0, Math.round(Number(options.cropY ?? 0)));
    const availableWidth = bitmap.width - x;
    const availableHeight = bitmap.height - y;

    if (availableWidth <= 0 || availableHeight <= 0) {
      throw new ImageProcessingError(
        'UNSUPPORTED_INPUT',
        'El punto de inicio del recorte queda fuera de la imagen.',
      );
    }

    // Un ancho o alto de 0 significa «hasta el borde de la imagen».
    const requestedWidth = Math.round(Number(options.cropWidth ?? 0));
    const requestedHeight = Math.round(Number(options.cropHeight ?? 0));
    const width = Math.max(1, requestedWidth > 0 ? requestedWidth : availableWidth);
    const height = Math.max(1, requestedHeight > 0 ? requestedHeight : availableHeight);

    if (x + width > bitmap.width || y + height > bitmap.height) {
      throw new ImageProcessingError(
        'UNSUPPORTED_INPUT',
        'El recorte queda fuera de los límites de la imagen. Ajusta X, Y, ancho y alto.',
      );
    }

    onProgress?.(35);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new ImageProcessingError('ENCODE_FAILED', 'No se pudo crear el lienzo de salida.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    if (options.background && (format === 'jpg' || format === 'bmp')) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);

    const encoded = await encodeCanvas(canvas, format, options.quality);
    onProgress?.(100);
    const meta = metaFor(format, encoded.width, encoded.height, encoded.blob);
    if (encoded.icoSizes) meta.icoSizes = encoded.icoSizes;
    return { blob: encoded.blob, meta };
  } finally {
    bitmap.close();
  }
}
