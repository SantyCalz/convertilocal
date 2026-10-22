/**
 * src/scripts/processors/registry.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor } from '@/types/processor';
import { passthroughProcessor } from './passthrough';

/**
 * Registro de procesadores.
 *
 * Los módulos de imagen se cargan con `import()` al pulsar procesar, de modo
 * que el JS inicial no incluye codecs ni lógica de conversión. heic2any solo
 * se importa desde el procesador HEIC y jamás desde el resto de herramientas.
 */
const eager = new Map<string, Processor>([[passthroughProcessor.id, passthroughProcessor]]);

const loaders: Record<string, () => Promise<Processor>> = {
  'image-convert': () =>
    import('./image/converter').then((module) => module.imageConverterProcessor),
  'image-compress': () =>
    import('./image/compressor').then((module) => module.imageCompressorProcessor),
  'image-exif-clean': () =>
    import('./image/exif-cleaner').then((module) => module.exifCleanerProcessor),
  'heic-convert': () => import('./image/heic').then((module) => module.heicConverterProcessor),
  'remove-background': () =>
    import('./image/remove-background').then((module) => module.removeBackgroundProcessor),
  'image-resize': () => import('./image/resize').then((module) => module.imageResizeProcessor),
  'image-crop': () => import('./image/crop').then((module) => module.imageCropProcessor),
  'html-to-pdf': () =>
    import('./documents/html-to-pdf').then((module) => module.htmlToPdfProcessor),
  'word-to-pdf': () =>
    import('./documents/word-to-pdf').then((module) => module.wordToPdfProcessor),
  'excel-to-pdf': () =>
    import('./documents/excel-to-pdf').then((module) => module.excelToPdfProcessor),
  'pdf-to-pdfa': () =>
    import('./documents/pdf-to-pdfa').then((module) => module.pdfToPdfaProcessor),
  'pdf-merge': () => import('./pdf/merge').then((module) => module.pdfMergeProcessor),
  'pdf-split': () => import('./pdf/split').then((module) => module.pdfSplitProcessor),
  'pdf-organize': () =>
    import('./pdf/organize').then((module) => module.pdfOrganizeProcessor),
  'pdf-image-to-pdf': () =>
    import('./pdf/image-to-pdf').then((module) => module.pdfImageToPdfProcessor),
  'pdf-to-image': () =>
    import('./pdf/pdf-to-image').then((module) => module.pdfToImageProcessor),
  'pdf-watermark': () =>
    import('./pdf/watermark').then((module) => module.pdfWatermarkProcessor),
  'pdf-page-numbers': () =>
    import('./pdf/page-numbers').then((module) => module.pdfPageNumbersProcessor),
  'pdf-compress': () =>
    import('./pdf/compress').then((module) => module.pdfCompressProcessor),
  'data-convert': () =>
    import('./data/data-convert').then((module) => module.dataConvertProcessor),
  'markdown-html': () =>
    import('./data/markdown-html').then((module) => module.markdownHtmlProcessor),
  'text-cleaner': () =>
    import('./data/text-cleaner').then((module) => module.textCleanerProcessor),
  'audio-convert': () =>
    import('./media/audio-convert').then((module) => module.audioConvertProcessor),
  'audio-extract': () =>
    import('./media/audio-extract').then((module) => module.audioExtractProcessor),
  'audio-cut': () =>
    import('./media/audio-cut').then((module) => module.audioCutProcessor),
  'video-to-gif': () =>
    import('./media/video-gif').then((module) => module.videoToGifProcessor),
  'video-compress': () =>
    import('./media/video-compress').then((module) => module.videoCompressProcessor),
};

export async function getProcessor(id: string): Promise<Processor | undefined> {
  const cached = eager.get(id);
  if (cached) return cached;

  const loader = loaders[id];
  if (!loader) return undefined;

  const processor = await loader();
  eager.set(processor.id, processor);
  return processor;
}
