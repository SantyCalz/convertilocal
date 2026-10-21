import type { ImageJobRequest, ImageWorkerMessage } from '@/types/image';
import { ImageProcessingError } from '@/types/image';
import { cleanFile, compressFile, convertFile, resizeFile, cropFile } from '@/scripts/core/image/operations';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ImageJobRequest>) => void) | null;
  postMessage: (message: ImageWorkerMessage) => void;
};

scope.onmessage = (event: MessageEvent<ImageJobRequest>): void => {
  const { id, op, file, options } = event.data;
  if (!id || !file) return;

  const onProgress = (percent: number): void => {
    scope.postMessage({ type: 'progress', id, percent });
  };

  const run =
    op === 'compress'
      ? compressFile
      : op === 'clean'
        ? cleanFile
        : op === 'resize'
          ? resizeFile
          : op === 'crop'
            ? cropFile
            : convertFile;

  run(file, options, onProgress)
    .then((result) => {
      scope.postMessage({ type: 'result', id, blob: result.blob, meta: result.meta });
    })
    .catch((error: unknown) => {
      const known = error instanceof ImageProcessingError;
      scope.postMessage({
        type: 'error',
        id,
        code: known ? error.code : 'ENCODE_FAILED',
        message: known
          ? error.message
          : 'No se pudo procesar la imagen. Inténtalo de nuevo o usa otro archivo.',
      });
    });
};
