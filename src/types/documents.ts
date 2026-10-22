/**
 * src/types/documents.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption, ProcessorOptions } from './processor';

export type DocumentErrorCode =
  | 'INVALID_DOCUMENT'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_RANGE'
  | 'NO_PAGES'
  | 'PROCESSING_FAILED'
  | 'WORKER_FAILED';

export class DocumentProcessingError extends Error {
  readonly code: DocumentErrorCode;

  constructor(code: DocumentErrorCode, message: string) {
    super(message);
    this.name = 'DocumentProcessingError';
    this.code = code;
  }
}

/** Contenido editorial de una herramienta de documentos. */
export type DocumentToolContent = {
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
  /** Lo que la herramienta hace de verdad. Se muestra arriba del pliegue. */
  does: string[];
  /** Lo que no hace, para no crear expectativas falsas. */
  doesNot: string[];
};

export type DocumentToolConfig = {
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

export type DocumentTool = DocumentToolContent & DocumentToolConfig;

export type DocumentJobRequest = {
  id: string;
  files: File[];
  options: ProcessorOptions;
};
