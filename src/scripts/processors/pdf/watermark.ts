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
