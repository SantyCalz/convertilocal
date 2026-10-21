import type { Processor, ProcessorOutput } from '@/types/processor';
import { ImageProcessingError } from '@/types/image';
import { sniffImage } from '@/scripts/core/image/sniff';

const INPUT_FORMATS = ['png', 'jpg', 'webp', 'avif', 'bmp', 'ico'];

/**
 * Carpeta donde `npm run sync:bg` deja los assets autoalojados del modelo.
 * La librería los resuelve con `new URL(chunk.name, publicPath)`, así que la
 * ruta debe terminar en barra.
 */
const PUBLIC_PATH = '/assets/imgly/';

export const removeBackgroundProcessor: Processor = {
  id: 'remove-background',
  name: 'Eliminar fondo',
  accepts: [
    '.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.ico',
    'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon',
  ],
  async run(files, options, onProgress) {
    const { removeBackground } = await import('@imgly/background-removal');

    // La librería llama «small» a isnet_quint8 (42 MB) y «medium» a
    // isnet_fp16 (84 MB). isnet, el modelo grande, pesa 176 MB.
    const model = options.model === 'medium' ? 'isnet_fp16' : 'isnet_quint8';
    const device = options.device === 'gpu' ? 'gpu' : 'cpu';
    const outputFormat = options.outputFormat === 'webp' ? 'image/webp' : 'image/png';
    const extension = outputFormat === 'image/webp' ? 'webp' : 'png';
    const outputs: ProcessorOutput[] = [];

    for (const [index, file] of files.entries()) {
      if (file.size === 0) {
        throw new ImageProcessingError('EMPTY_FILE', `“${file.name}” está vacío.`);
      }

      const sniffed = await sniffImage(file);
      if (!sniffed || !INPUT_FORMATS.includes(sniffed.format)) {
        throw new ImageProcessingError('UNSUPPORTED_INPUT', `“${file.name}” no es una imagen compatible.`);
      }

      const share = 100 / files.length;
      const blob = await removeBackground(file, {
        model,
        device,
        proxyToWorker: true,
        publicPath: new URL(PUBLIC_PATH, window.location.origin).href,
        output: { format: outputFormat },
        progress: (_key, loaded, total) => {
          const ratio = total > 0 ? loaded / total : 0;
          onProgress?.(Math.min(99, Math.round((index + ratio) * share)));
        },
      });

      const name = file.name.replace(/\.[^.]+$/, '') + `-sin-fondo.${extension}`;
      outputs.push(new File([blob], name, { type: outputFormat, lastModified: Date.now() }));
      onProgress?.(Math.min(99, Math.round((index + 1) * share)));
    }

    if (outputs.length === 0) {
      throw new ImageProcessingError('EMPTY_FILE', 'Añade al menos una imagen válida.');
    }

    onProgress?.(100);
    return outputs;
  },
};
