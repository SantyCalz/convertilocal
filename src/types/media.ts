/**
 * src/types/media.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption, ProcessorOptions } from './processor';

export type MediaErrorCode =
  | 'INVALID_MEDIA'
  | 'UNSUPPORTED_FORMAT'
  | 'TOO_LARGE'
  | 'TOO_LONG'
  | 'PROCESSING_FAILED'
  | 'WORKER_FAILED';

export class MediaProcessingError extends Error {
  readonly code: MediaErrorCode;

  constructor(code: MediaErrorCode, message: string) {
    super(message);
    this.name = 'MediaProcessingError';
    this.code = code;
  }
}

export type MediaToolContent = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  why: string[];
  useCases: Array<{ title: string; body: string }>;
  mistakes: Array<{ title: string; body: string }>;
  faq: Array<{ q: string; a: string }>;
  keywords: string[];
  related: string[];
  updated: string;
};

export type MediaToolConfig = {
  processorId: string;
  accept: string;
  acceptLabel: string;
  actionLabel: string;
  baseName: string;
  multiple: boolean;
  maxSizeMB: number;
  maxFiles: number;
  maxTotalMB: number;
  previewMode: 'media' | 'none';
  options: ProcessorOption[];
  fixedOptions?: Record<string, string | number | boolean>;
  resultNote?: string;
};

export type MediaTool = MediaToolContent & MediaToolConfig;

export type MediaJobRequest = {
  files: File[];
  options: ProcessorOptions;
};
