import type { Processor, ProcessorOutput } from '@/types/processor';
import type { OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { runImageJob } from '@/scripts/core/worker-client';
import { clampNumber, MAX_SIDE } from '@/scripts/core/image/limits';
import { mimeForOutput, outputName, uniqueName } from '@/scripts/core/image/output';
import { sniffImage } from '@/scripts/core/image/sniff';

const INPUT_FORMATS = ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'];

function readFormat(value: unknown): OutputFormatId {
  return ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'].includes(String(value)) ? (value as OutputFormatId) : 'png';
}

export const imageCropProcessor: Processor = {
  id: 'image-crop',
  name: 'Recortar imagen',
  accepts: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.ico', 'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon'],
  async run(files, options, onProgress) {
    const format = readFormat(options.format);
    const quality = clampNumber(options.quality, 1, 100, format === 'avif' ? 65 : 90);
    const background = typeof options.background === 'string' ? options.background : '#ffffff';
    const x = Math.round(clampNumber(options.x, 0, MAX_SIDE, 0));
    const y = Math.round(clampNumber(options.y, 0, MAX_SIDE, 0));
    // Un ancho o alto de 0 significa «hasta el borde de la imagen».
    const width = Math.round(clampNumber(options.width, 0, MAX_SIDE, 0));
    const height = Math.round(clampNumber(options.height, 0, MAX_SIDE, 0));
    const used = new Set<string>();
    const outputs: ProcessorOutput[] = [];

    for (const [index, file] of files.entries()) {
      if (file.size === 0) throw new ImageProcessingError('EMPTY_FILE', `“${file.name}” está vacío.`);
      const sniffed = await sniffImage(file);
      if (!sniffed || !INPUT_FORMATS.includes(sniffed.format)) {
        throw new ImageProcessingError('UNSUPPORTED_INPUT', `“${file.name}” no es una imagen compatible.`);
      }

      const result = await runImageJob(file, 'crop', { format, quality, background, cropX: x, cropY: y, cropWidth: width, cropHeight: height }, (percent) => {
        const overall = Math.round(((index + percent / 100) / files.length) * 100);
        onProgress?.(Math.min(overall, 99));
      });

      const name = uniqueName(outputName(file.name, format), used);
      outputs.push(new File([result.blob], name, { type: mimeForOutput(format), lastModified: Date.now() }));
    }

    onProgress?.(100);
    return outputs;
  },
};
