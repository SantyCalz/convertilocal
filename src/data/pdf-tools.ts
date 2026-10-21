import type { PdfTool, PdfToolConfig, PdfToolContent } from '@/types/pdf';
import contentData from './pdf-tools.json';
import { PDF_OPTIONS } from './pdf-options';

const PDF_CONTENT = contentData as PdfToolContent[];

const CONFIG: Record<string, PdfToolConfig> = {
  'unir-pdf': {
    processorId: 'pdf-merge',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Unir PDF',
    baseName: 'documento-unido',
    multiple: true,
    maxSizeMB: 30,
    maxFiles: 20,
    maxTotalMB: 100,
    previewMode: 'merge',
    options: [],
    resultNote:
      'El PDF final se genera en tu dispositivo. Los marcadores, formularios y firmas digitales pueden no conservarse al unir.',
  },
  'dividir-pdf': {
    processorId: 'pdf-split',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Dividir PDF',
    baseName: 'documento-dividido',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'pages',
    options: PDF_OPTIONS.split,
    resultNote:
      'Los rangos usan la posición física de la página, empezando en 1. Si generas varios archivos, se descargan en un ZIP.',
  },
  'rotar-pdf': {
    processorId: 'pdf-organize',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Guardar rotación',
    baseName: 'documento-rotado',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'organize',
    options: [],
    fixedOptions: { mode: 'rotate' },
    resultNote:
      'La rotación se guarda en el PDF sin volver a dibujar el contenido. Modificar el archivo invalida firmas digitales.',
  },
  'reordenar-pdf': {
    processorId: 'pdf-organize',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Guardar nuevo orden',
    baseName: 'documento-reordenado',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'organize',
    options: [],
    fixedOptions: { mode: 'reorder' },
    resultNote:
      'Al reordenar se reconstruye el documento: marcadores, formularios y firmas digitales pueden no conservarse. La vista previa muestra hasta 24 páginas.',
  },
  'imagen-a-pdf': {
    processorId: 'pdf-image-to-pdf',
    accept: 'image/jpeg,image/png,image/webp,image/avif,image/bmp,image/gif',
    acceptLabel: 'JPG, PNG, WebP, AVIF, BMP o GIF',
    actionLabel: 'Crear PDF',
    baseName: 'imagenes-a-pdf',
    multiple: true,
    maxSizeMB: 25,
    maxFiles: 20,
    maxTotalMB: 100,
    previewMode: 'none',
    options: PDF_OPTIONS.imageToPdf,
    resultNote:
      'Las imágenes se adaptan a la página con márgenes. Los PNG conservan su transparencia; los JPEG usan la calidad elegida.',
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
    previewMode: 'pages',
    options: PDF_OPTIONS.pdfToImage,
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
    previewMode: 'pages',
    options: PDF_OPTIONS.pdfToPng,
    fixedOptions: { format: 'png' },
    resultNote:
      'PNG conserva la nitidez del texto y los gráficos, a cambio de archivos más pesados. El fondo se aplana en blanco.',
  },
  'marca-de-agua-pdf': {
    processorId: 'pdf-watermark',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Aplicar marca de agua',
    baseName: 'documento-marca-agua',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'pages',
    options: PDF_OPTIONS.watermark,
    resultNote:
      'La marca se aplica a todas las páginas y no se puede quitar con esta herramienta. Conserva el PDF original sin marca.',
  },
  'numerar-paginas-pdf': {
    processorId: 'pdf-page-numbers',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Numerar páginas',
    baseName: 'documento-numerado',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'pages',
    options: PDF_OPTIONS.pageNumbers,
    resultNote:
      'La numeración se dibuja con Helvetica y no sustituye números que ya formen parte del contenido. Modificar el PDF invalida firmas digitales.',
  },
  'comprimir-pdf': {
    processorId: 'pdf-compress',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF',
    actionLabel: 'Comprimir PDF',
    baseName: 'documento-comprimido',
    multiple: false,
    maxSizeMB: 30,
    maxFiles: 1,
    maxTotalMB: 30,
    previewMode: 'pages',
    options: PDF_OPTIONS.compress,
    resultNote:
      'Aviso: la máxima compresión convierte cada página en una imagen. El texto dejará de ser seleccionable y se perderán enlaces y formularios.',
  },
};

export const PDF_TOOLS: PdfTool[] = PDF_CONTENT.map((content) => {
  const config = CONFIG[content.slug];
  if (!config) {
    throw new Error(`Falta la configuración de la herramienta PDF: ${content.slug}`);
  }
  return { ...content, ...config };
});

export function getPdfTool(slug: string): PdfTool | undefined {
  return PDF_TOOLS.find((tool) => tool.slug === slug);
}

export const PDF_TOOL_PATHS = PDF_TOOLS.map((tool) => `/pdf/${tool.slug}`);
