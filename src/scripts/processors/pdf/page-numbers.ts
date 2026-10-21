/**
 * src/scripts/processors/pdf/page-numbers.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfPageNumbersProcessor: Processor = {
  id: 'pdf-page-numbers',
  name: 'Numerar páginas PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    return runPdfProcessor('page-numbers', files, options, onProgress);
  },
};
