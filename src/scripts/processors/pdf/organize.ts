import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfOrganizeProcessor: Processor = {
  id: 'pdf-organize',
  name: 'Organizar PDF',
  accepts: ['.pdf'],
  async run(files, options, onProgress) {
    return runPdfProcessor('organize', files, options, onProgress);
  },
};
