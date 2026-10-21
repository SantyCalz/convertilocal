/**
 * src/scripts/processors/image/heic.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOutput } from '@/types/processor';
import type { OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { runImageJob } from '@/scripts/core/worker-client';
import { clampNumber, MAX_SIDE } from '@/scripts/core/image/limits';
import { baseNameOf, mimeForOutput, outputName, uniqueName } from '@/scripts/core/image/output';
import { sniffImage } from '@/scripts/core/image/sniff';

function readFormat(value: unknown): Extract<OutputFormatId, 'jpg' | 'png'> {
  return value === 'png' ? 'png' : 'jpg';
}

export const heicConverterProcessor: Processor = {
  id: 'heic-convert',
  name: 'Conversor HEIC',
  accepts: ['.heic', '.heif', 'image/heic', 'image/heif'],
  options: [],
  async run(files, options, onProgress) {
    const format = readFormat(options.format);
    const quality = clampNumber(options.quality, 20, 100, 90);
    const background = typeof options.background === 'string' ? options.background : '#ffffff';
    const maxWidth = Math.round(clampNumber(options.maxWidth, 0, MAX_SIDE, 0));
    const maxHeight = Math.round(clampNumber(options.maxHeight, 0, MAX_SIDE, 0));
    const used = new Set<string>();
    const outputs: ProcessorOutput[] = [];
    const { default: heic2any } = await import('heic2any');

    for (const [index, file] of files.entries()) {
      const sniffed = await sniffImage(file);
      if (!sniffed || sniffed.format !== 'heic') {
        throw new ImageProcessingError(
          'UNSUPPORTED_INPUT',
          `«${file.name}» no parece un HEIC/HEIF válido.`,
        );
      }

      const start = (index / files.length) * 100;
      const span = 100 / files.length;
      onProgress?.(Math.round(start + span * 0.05));

      let decoded: Blob;
      try {
        const converted = await heic2any({
          blob: file,
          toType: 'image/png',
          quality: 1,
        });
        const first = Array.isArray(converted) ? converted[0] : converted;
        if (!first) throw new Error('HEIC vacío');
        decoded = first;
      } catch (error) {
        console.error(error);
        throw new ImageProcessingError(
          'HEIC_FAILED',
          `No pudimos decodificar «${file.name}». Comprueba que el archivo no esté dañado; algunos HEIC de ráfaga o con perfiles raros no son compatibles.`,
        );
      }

      onProgress?.(Math.round(start + span * 0.45));

      const pngFile = new File([decoded], `${baseNameOf(file.name)}.png`, { type: 'image/png' });
      const result = await runImageJob(
        pngFile,
        'convert',
        { format, quality, background, maxWidth, maxHeight },
        (percent) => {
          onProgress?.(Math.round(start + span * (0.45 + (percent / 100) * 0.54)));
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
