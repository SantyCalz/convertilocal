/**
 * src/types/data.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption, ProcessorOptions } from './processor';

export type DataErrorCode =
  | 'INVALID_DATA'
  | 'UNSUPPORTED_FORMAT'
  | 'TOO_MANY_ROWS'
  | 'PROCESSING_FAILED'
  | 'WORKER_FAILED';

export class DataProcessingError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = 'DataProcessingError';
    this.code = code;
  }
}

export type DataToolContent = {
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

export type DataToolConfig = {
  processorId: string;
  accept: string;
  acceptLabel: string;
  actionLabel: string;
  baseName: string;
  multiple: boolean;
  maxSizeMB: number;
  maxFiles: number;
  maxTotalMB: number;
  previewMode: 'none';
  options: ProcessorOption[];
  fixedOptions?: Record<string, string | number | boolean>;
  resultNote?: string;
};

export type DataTool = DataToolContent & DataToolConfig;

export type DataFormat = 'json' | 'csv' | 'xlsx' | 'yaml' | 'xml' | 'markdown' | 'html' | 'text';

export type DataJobRequest = {
  files: File[];
  options: ProcessorOptions;
};
