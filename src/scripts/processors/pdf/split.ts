/**
 * src/scripts/processors/pdf/split.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfSplitProcessor: Processor = {
  id: 'pdf-split',
  name: 'Dividir PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    return runPdfProcessor('split', files, options, onProgress);
  },
};
