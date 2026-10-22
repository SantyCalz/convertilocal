/**
 * src/data/documents-tools.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { DocumentTool, DocumentToolConfig, DocumentToolContent } from '@/types/documents';
import contentData from './documents-tools.json';
import { DOCUMENT_OPTIONS } from './documents-options';

const DOCUMENT_CONTENT = contentData as DocumentToolContent[];

const CONFIG: Record<string, DocumentToolConfig> = {
  'jpg-a-pdf': {
    processorId: 'pdf-image-to-pdf',
    accept: 'image/jpeg,image/heic,image/heif',
    acceptLabel: 'JPG',
    actionLabel: 'Crear PDF',
    baseName: 'jpg-a-pdf',
    multiple: true,
    maxSizeMB: 25,
    maxFiles: 20,
    maxTotalMB: 100,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.imageToPdf,
    resultNote:
      'Las imágenes se incrustan sin recomprimir. La orientación EXIF se corrige automáticamente y el PDF se genera en tu dispositivo.',
  },
  'png-a-pdf': {
    processorId: 'pdf-image-to-pdf',
    accept: 'image/png,image/heic,image/heif',
    acceptLabel: 'PNG',
    actionLabel: 'Crear PDF',
    baseName: 'png-a-pdf',
    multiple: true,
    maxSizeMB: 25,
    maxFiles: 20,
    maxTotalMB: 100,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.imageToPdf,
    resultNote:
      'El canal alfa se conserva: la transparencia se ve detrás de la imagen. El PDF se genera en tu dispositivo.',
  },
  'pdf-a-jpg': {
    processorId: 'pdf-to-image',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Convertir a JPG',
    baseName: 'pdf-a-jpg',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.pdfToJpg,
    fixedOptions: { format: 'jpg' },
    resultNote:
      'Cada página se convierte en un JPG. Si hay varias, se descargan juntas en un ZIP generado localmente.',
  },
  'pdf-a-png': {
    processorId: 'pdf-to-image',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Convertir a PNG',
    baseName: 'pdf-a-png',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.pdfToPng,
    fixedOptions: { format: 'png' },
    resultNote:
      'PNG conserva el detalle del texto y los gráficos, a cambio de archivos más pesados. El fondo se aplana en blanco.',
  },
};

export const DOCUMENT_TOOLS: DocumentTool[] = DOCUMENT_CONTENT.map((content) => {
  const config = CONFIG[content.slug];
  if (!config) {
    throw new Error(`Falta la configuración de la herramienta de documentos: ${content.slug}`);
  }
  return { ...content, ...config };
});

export function getDocumentTool(slug: string): DocumentTool | undefined {
  return DOCUMENT_TOOLS.find((tool) => tool.slug === slug);
}

export const DOCUMENT_TOOL_PATHS = DOCUMENT_TOOLS.map((tool) => `/convertir/${tool.slug}`);
