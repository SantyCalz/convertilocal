import type { Processor, ProcessorOptions, ProcessorOutput } from '@/types/processor';
import type { ImageFormatId, OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { runImageJob } from '@/scripts/core/worker-client';
import { clampNumber, MAX_SIDE } from '@/scripts/core/image/limits';
import { mimeForOutput, outputName, uniqueName } from '@/scripts/core/image/output';
import { sniffImage } from '@/scripts/core/image/sniff';

const INPUT_FORMATS: ImageFormatId[] = ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'];

function readFormat(value: unknown): OutputFormatId {
  return ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'].includes(String(value))
    ? (value as OutputFormatId)
    : 'png';
}

function readWarning(options: ProcessorOptions): (message: string) => void {
  return typeof options.onWarning === 'function' ? (options.onWarning as (message: string) => void) : () => undefined;
}

export const imageConverterProcessor: Processor = {
  id: 'image-convert',
  name: 'Conversor de imágenes',
  accepts: [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.avif',
    '.bmp',
    '.ico',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/x-icon',
  ],
  options: [],
  async run(files, options, onProgress) {
    const format = readFormat(options.format);
    const quality = clampNumber(options.quality, 1, 100, format === 'avif' ? 65 : 90);
    const background = typeof options.background === 'string' ? options.background : '#ffffff';
    const maxWidth = Math.round(clampNumber(options.maxWidth, 0, MAX_SIDE, 0));
    const maxHeight = Math.round(clampNumber(options.maxHeight, 0, MAX_SIDE, 0));
    const warn = readWarning(options);
    const used = new Set<string>();
    const outputs: ProcessorOutput[] = [];

    for (const [index, file] of files.entries()) {
      if (file.size === 0) {
        throw new ImageProcessingError('EMPTY_FILE', `«${file.name}» está vacío.`);
      }

      const sniffed = await sniffImage(file);
      if (!sniffed || !INPUT_FORMATS.includes(sniffed.format)) {
        throw new ImageProcessingError(
          'UNSUPPORTED_INPUT',
          `«${file.name}» no es una imagen compatible con esta herramienta.`,
        );
      }

      if (sniffed.format === format) {
        warn(`«${file.name}» ya era ${format.toUpperCase()}; se ha vuelto a codificar.`);
      }

      const result = await runImageJob(
        file,
        'convert',
        {
          format,
          quality,
          background,
          maxWidth,
          maxHeight,
        },
        (percent) => {
          const overall = Math.round(((index + percent / 100) / files.length) * 100);
          onProgress?.(Math.min(overall, 99));
        },
      );

      const name = uniqueName(outputName(file.name, format), used);
      outputs.push(
        new File([result.blob], name, {
          type: mimeForOutput(format),
          lastModified: Date.now(),
        }),
      );
    }

    onProgress?.(100);
    return outputs;
  },
};
