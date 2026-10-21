/**
 * src/scripts/processors/media/audio-convert.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { MediaProcessingError } from '@/types/media';
import { fileFromMediaOutput, mimeTypeForExtension, notifyMediaWarning } from './shared';
import { runMediaJob } from '@/scripts/core/media/media-client';

export const audioConvertProcessor: Processor = {
  id: 'audio-convert',
  name: 'Convertir audio',
  accepts: ['.mp3', '.wav', '.ogg', '.oga', '.aac', '.m4a', '.flac', '.webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'video/webm'],
  async run(files, options, onProgress) {
    const outputs = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const output = await runMediaJob('convert', file, options, (percent) => {
        onProgress?.(Math.round((index / files.length) * 100 + percent / files.length));
      });
      outputs.push(fileFromMediaOutput(output, mimeTypeForExtension(output.extension)));
      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) throw new MediaProcessingError('INVALID_MEDIA', 'Añade al menos un archivo de audio válido.');
    notifyMediaWarning(options, 'La conversión de audio puede tardar en dispositivos móviles.');
    return outputs;
  },
};
