/**
 * src/scripts/processors/documents/html-to-pdf.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOutput } from '@/types/processor';
import { DocumentProcessingError } from '@/types/documents';

interface WarningOptions {
  onWarning?: (message: string) => void;
}

export const htmlToPdfProcessor: Processor = {
  id: 'html-to-pdf',
  name: 'HTML a PDF',
  accepts: ['.html', '.htm', 'text/html'],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) {
      throw new DocumentProcessingError(
        'INVALID_DOCUMENT',
        'Añade un archivo HTML o pega el código en el cuadro de texto.',
      );
    }

    const warningOptions = options as WarningOptions;
    onProgress?.(15);

    const source = await file.text();
    if (!source.trim()) {
      throw new DocumentProcessingError('INVALID_DOCUMENT', 'El archivo está vacío.');
    }

    const { sanitizeHtml, printHtmlAsPdf, rasterizeHtmlToPdf } = await import(
      '@/lib/doc/html-print'
    );

    const report = sanitizeHtml(source);
    if (!report.html.trim()) {
      throw new DocumentProcessingError(
        'INVALID_DOCUMENT',
        'No queda contenido después de limpiar el HTML. Prueba con un documento más simple.',
      );
    }

    for (const warning of report.warnings) warningOptions.onWarning?.(warning);

    onProgress?.(40);

    const pageSize = options.pageSize === 'letter' ? 'letter' : 'a4';
    const margin = typeof options.margin === 'string' ? options.margin : '12mm';
    const mode = options.mode === 'raster' ? 'raster' : 'vector';

    if (mode === 'raster') {
      warningOptions.onWarning?.(
        'Modo de compatibilidad: el texto no será seleccionable y el archivo puede resultar más pesado.',
      );

      const blob = await rasterizeHtmlToPdf(report.html, {
        pageSize,
        margin,
        scale: Number(options.scale) || 2,
        quality: (Number(options.quality) || 92) / 100,
      });

      onProgress?.(100);
      return [
        new File([blob], 'documento.pdf', { type: 'application/pdf', lastModified: Date.now() }),
      ] satisfies ProcessorOutput[];
    }

    // Modo vectorial: se abre el diálogo de impresión del navegador.
    const { printed } = await printHtmlAsPdf(report.html, {
      title: file.name.replace(/\.[^.]+$/, '') || 'Documento',
      pageSize,
      margin,
    });

    if (!printed) {
      warningOptions.onWarning?.(
        'Se ha cancelado la impresión. Vuelve a procesarlo y elige «Guardar como PDF» en el diálogo.',
      );
    }

    onProgress?.(100);

    // El HTML saneado se descarga además, para que quede a mano.
    return [
      new File([report.html], 'documento.html', { type: 'text/html', lastModified: Date.now() }),
    ] satisfies ProcessorOutput[];
  },
};
