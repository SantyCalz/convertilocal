/**
 * src/scripts/processors/pdf/watermark.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfWatermarkProcessor: Processor = {
  id: 'pdf-watermark',
  name: 'Marca de agua PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    return runPdfProcessor('watermark', files, options, onProgress);
  },
};
