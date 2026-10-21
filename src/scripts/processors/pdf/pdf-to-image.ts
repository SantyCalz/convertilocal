/**
 * src/scripts/processors/pdf/pdf-to-image.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { openPdf, closePdf, renderPageToBlob } from '@/scripts/core/pdf/pdfjs';
import { PdfProcessingError } from '@/types/pdf';
import { fileFromPdfOutput, notifyWarning } from './shared';

function baseName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}._ -]+/gu, '')
      .trim()
      .slice(0, 80) || 'documento'
  );
}

export const pdfToImageProcessor: Processor = {
  id: 'pdf-to-image',
  name: 'PDF a imagen',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para convertir.');

    const format = options.format === 'png' ? 'png' : 'jpg';
    const type = format === 'png' ? 'image/png' : 'image/jpeg';
    const dpi = Math.max(72, Math.min(300, Number(options.dpi) || 150));
    const rawQuality = Number(options.quality);
    const quality = Math.max(
      0.4,
      Math.min(1, Number.isFinite(rawQuality) && rawQuality > 0 ? (rawQuality > 1 ? rawQuality / 100 : rawQuality) : 0.9),
    );
    const name = baseName(file.name);

    onProgress?.(2);
    const document = await openPdf(file);

    try {
      const total = document.numPages;
      if (total > 100) {
        throw new PdfProcessingError(
          'TOO_MANY_PAGES',
          `Este PDF tiene ${total} páginas. El límite para convertir a imágenes es 100; divídelo primero.`,
        );
      }

      const outputs = [];
      for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        try {
          const rendered = await renderPageToBlob(page, {
            dpi,
            type,
            quality,
            maxPixels: 12_000_000,
          });
          outputs.push(
            fileFromPdfOutput(
              rendered.blob,
              `${name}-pagina-${String(pageNumber).padStart(3, '0')}.${format}`,
              type,
            ),
          );
        } finally {
          page.cleanup();
        }
        onProgress?.(2 + ((pageNumber / total) * 96));
      }

      if (outputs.length === 0) {
        throw new PdfProcessingError('NO_PAGES', 'El PDF no contiene páginas.');
      }

      if (total > 1) {
        notifyWarning(
          options,
          'Las páginas se descargan juntas en un ZIP generado en tu dispositivo.',
        );
      }

      onProgress?.(100);
      return outputs;
    } finally {
      await closePdf(document);
    }
  },
};
