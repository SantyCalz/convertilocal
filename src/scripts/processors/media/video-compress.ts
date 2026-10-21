/**
 * src/scripts/processors/media/video-compress.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { MediaProcessingError } from '@/types/media';
import { fileFromMediaOutput, mimeTypeForExtension, notifyMediaWarning } from './shared';
import { runMediaJob } from '@/scripts/core/media/media-client';

export const videoCompressProcessor: Processor = {
  id: 'video-compress',
  name: 'Comprimir video',
  accepts: ['.mp4', '.webm', '.mov', 'video/mp4', 'video/webm', 'video/quicktime'],
  async run(files, options, onProgress) {
    const outputs = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const output = await runMediaJob('compress', file, options, (percent) => {
        onProgress?.(Math.round((index / files.length) * 100 + percent / files.length));
      });
      outputs.push(fileFromMediaOutput(output, mimeTypeForExtension(output.extension)));
      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) throw new MediaProcessingError('INVALID_MEDIA', 'Añade al menos un video válido.');
    notifyMediaWarning(options, 'La compresión de video consume CPU y RAM. En móviles usa clips cortos.');
    return outputs;
  },
};
