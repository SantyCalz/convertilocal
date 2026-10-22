/**
 * src/scripts/processors/pdf/image-to-pdf.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { PdfProcessingError } from '@/types/pdf';
import { sniffImage } from '@/scripts/core/image/sniff';
import { runPdfProcessor } from './shared';

/**
 * Convierte un HEIC/HEIF a PNG antes de mandarlo al worker.
 *
 * El canvas de un Worker no puede decodificar HEIC, y `heic2any` necesita
 * trabajar en el hilo principal (crea su propio worker). El PNG resultante
 * conserva el canal alfa, que es justo lo que se quiere al incrustar.
 */
async function decodeHeic(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');

  try {
    const converted = await heic2any({ blob: file, toType: 'image/png', quality: 1 });
    const first = Array.isArray(converted) ? converted[0] : converted;
    if (!first) throw new Error('HEIC vacío');
    const name = file.name.replace(/\.[^.]+$/, '') || 'imagen';
    return new File([first], `${name}.png`, { type: 'image/png' });
  } catch (error) {
    console.error(error);
    throw new PdfProcessingError(
      'UNSUPPORTED',
      `No pudimos decodificar «${file.name}». Prueba con la herramienta de HEIC a JPG o con una copia en PNG.`,
    );
  }
}

export const pdfImageToPdfProcessor: Processor = {
  id: 'pdf-image-to-pdf',
  name: 'Imagen a PDF',
  accepts: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  async run(files, options, onProgress) {
    const prepared: File[] = [];

    for (const [index, file] of files.entries()) {
      const sniffed = await sniffImage(file);

      if (sniffed?.format === 'heic') {
        onProgress?.(Math.round((index / files.length) * 100));
        prepared.push(await decodeHeic(file));
        continue;
      }

      if (!sniffed) {
        throw new PdfProcessingError(
          'UNSUPPORTED',
          `«${file.name}» no parece una imagen válida. Prueba con un JPG, PNG, WebP, AVIF, BMP, GIF o HEIC.`,
        );
      }

      prepared.push(file);
    }

    return runPdfProcessor('image-to-pdf', prepared, options, onProgress);
  },
};
