import type { Processor } from '@/types/processor';
import type { PdfRasterPage } from '@/types/pdf';
import { PdfProcessingError } from '@/types/pdf';
import { closePdf, openPdf, renderPageToBlob } from '@/scripts/core/pdf/pdfjs';
import { notifyWarning, runPdfProcessor } from './shared';

export const pdfCompressProcessor: Processor = {
  id: 'pdf-compress',
  name: 'Comprimir PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para comprimir.');

    if (options.mode !== 'raster') {
      return runPdfProcessor('compress-optimize', files, options, onProgress);
    }

    const dpi = Math.max(72, Math.min(150, Number(options.dpi) || 100));
    const rawQuality = Number(options.quality);
    const quality = Math.max(
      0.4,
      Math.min(0.95, Number.isFinite(rawQuality) && rawQuality > 0 ? (rawQuality > 1 ? rawQuality / 100 : rawQuality) : 0.72),
    );

    onProgress?.(2);
    const document = await openPdf(file);
    const pages: PdfRasterPage[] = [];

    try {
      const total = document.numPages;
      if (total > 100) {
        throw new PdfProcessingError(
          'TOO_MANY_PAGES',
          `Este PDF tiene ${total} páginas. El límite para rasterizar es 100; divídelo primero.`,
        );
      }

      for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        try {
          const rendered = await renderPageToBlob(page, {
            dpi,
            type: 'image/jpeg',
            quality,
            maxPixels: 12_000_000,
          });
          pages.push({
            blob: rendered.blob,
            width: rendered.width,
            height: rendered.height,
            pageWidth: rendered.pageWidth,
            pageHeight: rendered.pageHeight,
          });
        } finally {
          page.cleanup();
        }
        onProgress?.(2 + (pageNumber / total) * 48);
      }
    } finally {
      await closePdf(document);
    }

    notifyWarning(
      options,
      'La compresión máxima convierte cada página en una imagen: el texto dejará de ser seleccionable y se perderán enlaces y formularios.',
    );

    return runPdfProcessor('compress-raster', files, options, (percent) => {
      onProgress?.(50 + percent * 0.5);
    }, pages);
  },
};
