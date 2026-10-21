import type { Processor } from '@/types/processor';
import { MediaProcessingError } from '@/types/media';
import { fileFromMediaOutput, mimeTypeForExtension, notifyMediaWarning } from './shared';
import { runMediaJob } from '@/scripts/core/media/media-client';

export const audioExtractProcessor: Processor = {
  id: 'audio-extract',
  name: 'Extraer audio',
  accepts: ['.mp4', '.webm', '.mov', '.mkv', 'video/mp4', 'video/webm', 'video/quicktime'],
  async run(files, options, onProgress) {
    const outputs = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const output = await runMediaJob('extract', file, options, (percent) => {
        onProgress?.(Math.round((index / files.length) * 100 + percent / files.length));
      });
      outputs.push(fileFromMediaOutput(output, mimeTypeForExtension(output.extension)));
      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) throw new MediaProcessingError('INVALID_MEDIA', 'Añade al menos un video válido.');
    notifyMediaWarning(options, 'La extracción puede tardar según la duración y resolución del video.');
    return outputs;
  },
};
