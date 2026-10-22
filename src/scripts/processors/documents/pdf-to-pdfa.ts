/**
 * src/scripts/processors/documents/pdf-to-pdfa.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Procesador PDF → PDF/A-2b. Delega toda la conversión en el worker: el
 * worker ejecuta Ghostscript bajo SAFER y después inyecta con pdf-lib el
 * OutputIntent y los metadatos XMP. Aquí solo se valida la entrada y se
 * construye el fichero de salida.
 */
import type { Processor, ProcessorOutput } from '@/types/processor';
import { PdfProcessingError } from '@/types/pdf';
import { runPdfaJob } from '@/scripts/core/pdf/pdfa-worker-client';

const MAX_MB = 30;

export const pdfToPdfaProcessor: Processor = {
  id: 'pdf-to-pdfa',
  name: 'PDF a PDF/A',
  accepts: ['.pdf', 'application/pdf'],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) {
      throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para convertir.');
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      throw new PdfProcessingError(
        'TOO_MANY_PAGES',
        `El PDF supera los ${MAX_MB} MB. Prueba con un archivo más ligero.`,
      );
    }

    onProgress?.(2);
    const blob = await runPdfaJob(file, options, (percent) => onProgress?.(percent));
    onProgress?.(100);

    return [
      new File([blob], 'documento-pdfa.pdf', {
        type: 'application/pdf',
        lastModified: Date.now(),
      }),
    ] satisfies ProcessorOutput[];
  },
};
