/**
 * src/types/pdf.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption, ProcessorOptions } from './processor';

export type PdfErrorCode =
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'TOO_MANY_PAGES'
  | 'INVALID_RANGE'
  | 'NO_PAGES'
  | 'UNSUPPORTED'
  | 'WORKER_FAILED'
  | 'PROCESSING_FAILED';

export class PdfProcessingError extends Error {
  readonly code: PdfErrorCode;

  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = 'PdfProcessingError';
    this.code = code;
  }
}

export type PdfJobOperation =
  | 'merge'
  | 'split'
  | 'organize'
  | 'image-to-pdf'
  | 'watermark'
  | 'page-numbers'
  | 'compress-optimize'
  | 'compress-raster';

/** Una página ya rasterizada que el worker embeberá en el PDF final. */
export interface PdfRasterPage {
  blob: Blob;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

export interface PdfOutput {
  blob: Blob;
  name: string;
  type: string;
}

export interface PdfJobRequest {
  id: string;
  op: PdfJobOperation;
  files: File[];
  options: ProcessorOptions;
  pages?: PdfRasterPage[];
}

export type PdfWorkerMessage =
  | { type: 'progress'; id: string; percent: number }
  | { type: 'result'; id: string; outputs: PdfOutput[]; warnings?: string[] }
  | { type: 'error'; id: string; code: PdfErrorCode; message: string };

export type PdfPreviewMode = 'merge' | 'organize' | 'pages' | 'none';

export interface PdfToolContent {
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
}

export interface PdfToolConfig {
  processorId: string;
  accept: string;
  acceptLabel: string;
  actionLabel: string;
  baseName: string;
  multiple: boolean;
  maxSizeMB: number;
  maxFiles: number;
  maxTotalMB: number;
  previewMode: PdfPreviewMode;
  options: ProcessorOption[];
  fixedOptions?: Record<string, string | number | boolean>;
  resultNote?: string;
}

export type PdfTool = PdfToolContent & PdfToolConfig;
