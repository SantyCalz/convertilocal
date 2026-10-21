/**
 * src/scripts/processors/image/exif-cleaner.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOptions, ProcessorOutput } from '@/types/processor';
import type { ImageFormatId, OutputFormatId } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { runImageJob } from '@/scripts/core/worker-client';
import { mimeForOutput, suffixedOutputName, uniqueName } from '@/scripts/core/image/output';
import { sniffImage } from '@/scripts/core/image/sniff';

function readWarning(options: ProcessorOptions): (message: string) => void {
  return typeof options.onWarning === 'function' ? (options.onWarning as (message: string) => void) : () => undefined;
}

export const exifCleanerProcessor: Processor = {
  id: 'image-exif-clean',
  name: 'Limpiador de metadatos',
  accepts: ['.jpg', '.jpeg', '.png', '.webp', 'image/jpeg', 'image/png', 'image/webp'],
  options: [],
  async run(files, options, onProgress) {
    const fixOrientation = options.fixOrientation !== false;
    const warn = readWarning(options);
    const used = new Set<string>();
    const outputs: ProcessorOutput[] = [];
    let warnedEmpty = false;

    for (const [index, file] of files.entries()) {
      if (file.size === 0) {
        throw new ImageProcessingError('EMPTY_FILE', `«${file.name}» está vacío.`);
      }

      const sniffed = await sniffImage(file);
      if (!sniffed || !['jpg', 'png', 'webp'].includes(sniffed.format)) {
        throw new ImageProcessingError(
          'UNSUPPORTED_INPUT',
          'La limpieza de metadatos está disponible para JPG, PNG y WebP.',
        );
      }

      const format = sniffed.format as Exclude<ImageFormatId, 'heic'> as OutputFormatId;
      const result = await runImageJob(
        file,
        'clean',
        { format, fixOrientation },
        (percent) => {
          const overall = Math.round(((index + percent / 100) / files.length) * 100);
          onProgress?.(Math.min(overall, 99));
        },
      );

      if (result.meta.removedMetadata === false && !warnedEmpty) {
        warnedEmpty = true;
        warn('No encontramos metadatos EXIF, GPS ni XMP que eliminar en este archivo.');
      }
      if ((result.meta.orientation ?? 1) > 1 && !fixOrientation) {
        warn('La foto tenía orientación EXIF y no se ha corregido; puede aparecer girada.');
      }

      const name = uniqueName(suffixedOutputName(file.name, format, '-sin-exif'), used);
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
