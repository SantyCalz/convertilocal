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
