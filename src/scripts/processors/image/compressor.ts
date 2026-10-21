import type { Processor, ProcessorOptions, ProcessorOutput } from '@/types/processor';
import type { ImageFormatId, OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { runImageJob } from '@/scripts/core/worker-client';
import { clampNumber, MAX_SIDE } from '@/scripts/core/image/limits';
import { humanSize, mimeForOutput, suffixedOutputName, uniqueName } from '@/scripts/core/image/output';
import { sniffImage } from '@/scripts/core/image/sniff';

const INPUT_FORMATS: ImageFormatId[] = ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'];

function readFormat(value: unknown): OutputFormatId {
  return ['jpg', 'webp', 'avif'].includes(String(value)) ? (value as OutputFormatId) : 'jpg';
}

function readWarning(options: ProcessorOptions): (message: string) => void {
  return typeof options.onWarning === 'function' ? (options.onWarning as (message: string) => void) : () => undefined;
}

export const imageCompressorProcessor: Processor = {
  id: 'image-compress',
  name: 'Compresor de imágenes',
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
    const mode = options.mode === 'quality' ? 'quality' : 'target';
    const targetKb = clampNumber(options.targetKb, 5, 10_240, 100);
    const quality = clampNumber(options.quality, 20, 98, 82);
    const background = typeof options.background === 'string' ? options.background : '#ffffff';
    const maxWidth = Math.round(clampNumber(options.maxWidth, 0, MAX_SIDE, 0));
    const maxHeight = Math.round(clampNumber(options.maxHeight, 0, MAX_SIDE, 0));
    const allowDownscale = options.allowDownscale !== false;
    const warn = readWarning(options);
    const used = new Set<string>();
    const outputs: ProcessorOutput[] = [];
    let warnedTarget = false;

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

      const result = await runImageJob(
        file,
        'compress',
        {
          format,
          quality,
          background,
          maxWidth,
          maxHeight,
          mode,
          targetKb,
          allowDownscale,
        },
        (percent) => {
          const overall = Math.round(((index + percent / 100) / files.length) * 100);
          onProgress?.(Math.min(overall, 99));
        },
      );

      if (result.meta.targetMet === false && !warnedTarget) {
        warnedTarget = true;
        warn(
          `No se pudo alcanzar ${targetKb} KB sin bajar más la calidad o el tamaño. El archivo resultante pesa ${humanSize(result.blob.size)}.`,
        );
      }

      const suffix =
        mode === 'target' ? `-${Math.round(targetKb)}kb` : '-comprimido';
      const name = uniqueName(suffixedOutputName(file.name, format, suffix), used);
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
