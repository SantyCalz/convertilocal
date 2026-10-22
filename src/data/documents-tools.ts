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
  'html-a-pdf': {
    processorId: 'html-to-pdf',
    accept: '.html,.htm,text/html',
    acceptLabel: 'HTML',
    actionLabel: 'Generar PDF',
    baseName: 'documento-html',
    multiple: false,
    maxSizeMB: 5,
    maxFiles: 1,
    maxTotalMB: 5,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.htmlToPdf,
    resultNote:
      'En el modo vectorial se abre el diálogo de impresión: elige «Guardar como PDF». El HTML saneado también se descarga.',
  },
  'word-a-pdf': {
    processorId: 'word-to-pdf',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    acceptLabel: 'DOCX',
    actionLabel: 'Convertir a PDF',
    baseName: 'word-a-pdf',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.wordToPdf,
    resultNote:
      'Conversión aproximada: las columnas complejas y los cuadros de texto pueden simplificarse. Solo se aceptan .docx.',
  },
  'pdf-a-pdfa': {
    processorId: 'pdf-to-pdfa',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Convertir a PDF/A',
    baseName: 'documento-pdfa',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.pdfToPdfa,
    resultNote:
      'El PDF se optimiza y se le añade un OutputIntent sRGB y los metadatos PDF/A-2b. No certifica conformidad PDF/A.',
  },
  'excel-a-pdf': {
    processorId: 'excel-to-pdf',
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    acceptLabel: 'XLSX o XLS',
    actionLabel: 'Convertir a PDF',
    baseName: 'excel-a-pdf',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'none',
    options: DOCUMENT_OPTIONS.excelToPdf,
    resultNote:
      'Extracción de datos en tablas. Gráficos, imágenes y formato condicional no se preservan en esta versión.',
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
