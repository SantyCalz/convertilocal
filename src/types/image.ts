/** Tipos compartidos por el motor de imagen, la UI y el contenido SEO. */
/**
 * src/types/image.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type ImageFormatId = 'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'ico' | 'heic';
export type OutputFormatId = Exclude<ImageFormatId, 'heic'>;

export interface ImageFaq {
  q: string;
  a: string;
}

export interface ImageMistake {
  title: string;
  body: string;
}

export interface ImageUseCase {
  title: string;
  body: string;
}

export interface ImageFormatSpec {
  mime: string;
  extension: string;
  lossless: boolean;
  transparency: boolean;
  animation: boolean;
  support: string;
}

export interface ImageFormatInfo {
  id: ImageFormatId;
  label: string;
  extension: string;
  mime: string;
  aliases: string[];
  kind: 'lossless' | 'lossy' | 'uncompressed' | 'container';
  transparency: boolean;
  animation: boolean;
  browserSupport: string;
  history: string;
  compression: string;
  useCases: string[];
  avoidWhen: string[];
  mistakes: ImageMistake[];
  faq: ImageFaq[];
  spec: ImageFormatSpec;
}

export interface ConversionEntry {
  slug: string;
  from: ImageFormatId;
  to: OutputFormatId;
  processorId: 'image-convert' | 'heic-convert';
  title: string;
  h1: string;
  description: string;
  intro: string;
  why: string[];
  useCases: ImageUseCase[];
  mistakes: ImageMistake[];
  faq: ImageFaq[];
  related: string[];
  keywords: string[];
  updated: string;
}

export type ImageJobOperation = 'convert' | 'compress' | 'clean' | 'resize' | 'crop';

export interface ImageJobOptions {
  format: OutputFormatId;
  quality?: number;
  background?: string;
  maxWidth?: number;
  maxHeight?: number;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'stretch';
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  mode?: 'quality' | 'target';
  targetKb?: number;
  allowDownscale?: boolean;
  fixOrientation?: boolean;
  icoSizes?: number[];
}

export interface ImageJobRequest {
  id: string;
  op: ImageJobOperation;
  file: File;
  options: ImageJobOptions;
}

export interface ImageResultMeta {
  width: number;
  height: number;
  format: OutputFormatId;
  bytes: number;
  removedMetadata?: boolean;
  orientation?: number;
  targetMet?: boolean;
  targetBytes?: number;
  icoSizes?: number[];
}

export type ImageWorkerMessage =
  | { type: 'progress'; id: string; percent: number }
  | { type: 'result'; id: string; blob: Blob; meta: ImageResultMeta }
  | { type: 'error'; id: string; code: ImageErrorCode; message: string };

export interface ImageJobResult {
  blob: Blob;
  meta: ImageResultMeta;
}

export type ImageErrorCode =
  | 'EMPTY_FILE'
  | 'UNKNOWN_FORMAT'
  | 'UNSUPPORTED_INPUT'
  | 'UNSUPPORTED_OUTPUT'
  | 'DECODE_FAILED'
  | 'ENCODE_FAILED'
  | 'TOO_LARGE'
  | 'TARGET_UNREACHABLE'
  | 'AVIF_FAILED'
  | 'HEIC_FAILED';

export class ImageProcessingError extends Error {
  readonly code: ImageErrorCode;

  constructor(code: ImageErrorCode, message: string) {
    super(message);
    this.name = 'ImageProcessingError';
    this.code = code;
  }
}
