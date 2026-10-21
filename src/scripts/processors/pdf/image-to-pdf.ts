import type { Processor } from '@/types/processor';
import { runPdfProcessor } from './shared';

export const pdfImageToPdfProcessor: Processor = {
  id: 'pdf-image-to-pdf',
  name: 'Imagen a PDF',
  accepts: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  async run(files, options, onProgress) {
    return runPdfProcessor('image-to-pdf', files, options, onProgress);
  },
};
