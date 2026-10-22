/**
 * src/scripts/processors/documents/word-to-pdf.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOutput } from '@/types/processor';
import { DocumentProcessingError } from '@/types/documents';

const ACCEPTED = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const wordToPdfProcessor: Processor = {
  id: 'word-to-pdf',
  name: 'Word a PDF',
  accepts: [
    '.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) {
      throw new DocumentProcessingError('INVALID_DOCUMENT', 'Añade un archivo .docx.');
    }

    onProgress?.(10);

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.doc')) {
      throw new DocumentProcessingError(
        'UNSUPPORTED_FORMAT',
        'El formato .doc antiguo no es compatible. Ábrelo con Word o LibreOffice y guárdalo como .docx antes de convertirlo.',
      );
    }

    if (!lower.endsWith('.docx') && !ACCEPTED.includes(file.type)) {
      throw new DocumentProcessingError(
        'UNSUPPORTED_FORMAT',
        'Este archivo no parece un .docx válido. Solo se aceptan documentos de Word modernos (.docx).',
      );
    }

    const { default: mammoth } = await import('mammoth');

    let html: string;
    let messages: Array<{ type: string; message: string }>;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          // Las imágenes se embeben en base64 para que el PDF no dependa de
          // URLs externas (cumple la regla de "cero peticiones de red").
          convertImage: mammoth.images.imgElement((image) =>
            image.read('base64').then((imageBuffer) => ({
              src: `data:${image.contentType};base64,${imageBuffer}`,
            })),
          ),
        },
      );
      html = result.value;
      messages = result.messages ?? [];
    } catch (error) {
      console.error(error);
      throw new DocumentProcessingError(
        'INVALID_DOCUMENT',
        'No pudimos leer el documento. Comprueba que no esté dañado o protegido con contraseña.',
      );
    }

    onProgress?.(40);

    const { sanitizeHtml, printHtmlAsPdf, rasterizeHtmlToPdf } = await import(
      '@/lib/doc/html-print'
    );

    const report = sanitizeHtml(html);
    if (!report.html.trim()) {
      throw new DocumentProcessingError(
        'INVALID_DOCUMENT',
        'El documento no tiene contenido convertible. Puede que esté vacío o compuesto solo de elementos no soportados.',
      );
    }

    const warningOptions = options as { onWarning?: (message: string) => void };

    // Mammoth avisa de lo que no pudo convertir (columnas, cuadros de texto,
    // elementos de diseño...). Se trasladan como avisos en la UI.
    for (const message of messages) {
      if (message.type === 'warning' && message.message) {
        warningOptions.onWarning?.(`Word: ${message.message}`);
      }
    }
    for (const warning of report.warnings) warningOptions.onWarning?.(warning);

    if (messages.length === 0 && report.warnings.length === 0) {
      // Aviso estándar: el resultado no será idéntico al original.
      warningOptions.onWarning?.(
        'La conversión es aproximada: las columnas complejas, cuadros de texto y estilos avanzados pueden simplificarse.',
      );
    }

    onProgress?.(60);

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

    return [
      new File([report.html], 'documento.html', { type: 'text/html', lastModified: Date.now() }),
    ] satisfies ProcessorOutput[];
  },
};
