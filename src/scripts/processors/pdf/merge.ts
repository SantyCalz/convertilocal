import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfMergeProcessor: Processor = {
  id: 'pdf-merge',
  name: 'Unir PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    return runPdfProcessor('merge', files, options, onProgress);
  },
};
