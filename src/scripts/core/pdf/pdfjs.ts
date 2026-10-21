import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PdfProcessingError } from '@/types/pdf';

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

export const PDF_WORKER_SRC = '/scripts/pdf.worker.min.mjs';
export const PDF_ASSET_PATHS = {
  cMapUrl: '/assets/pdf/cmaps/',
  standardFontDataUrl: '/assets/pdf/standard_fonts/',
  wasmUrl: '/assets/pdf/wasm/',
} as const;

const PDF_DOCUMENT_OPTIONS = {
  ...PDF_ASSET_PATHS,
  cMapPacked: true,
  useWorkerFetch: true,
  isOffscreenCanvasSupported: true,
  useWasm: true,
  enableXfa: false,
  maxImageSize: 16_000_000,
  stopAtErrors: false,
  verbosity: 0,
} as const;

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((module) => {
      module.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
      return module;
    });
  }
  return pdfjsPromise;
}

function mapPdfError(error: unknown): PdfProcessingError {
  if (error instanceof PdfProcessingError) return error;

  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name)
      : '';
  const message = error instanceof Error ? error.message : '';

  if (name === 'PasswordException' || /password/i.test(message)) {
    return new PdfProcessingError(
      'ENCRYPTED_PDF',
      'Este PDF está protegido con contraseña. Esta herramienta todavía no puede abrirlo.',
    );
  }

  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return new PdfProcessingError(
      'INVALID_PDF',
      'El archivo no parece un PDF válido o está dañado.',
    );
  }

  return new PdfProcessingError(
    'PROCESSING_FAILED',
    message || 'No pudimos leer el PDF. Prueba con otro archivo.',
  );
}

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  try {
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const task = pdfjs.getDocument({ data, ...PDF_DOCUMENT_OPTIONS });
    return await task.promise;
  } catch (error) {
    throw mapPdfError(error);
  }
}

export async function closePdf(document: PDFDocumentProxy): Promise<void> {
  try {
    await document.cleanup();
  } catch {
    // La limpieza es best-effort.
  }
  try {
    await document.loadingTask.destroy();
  } catch {
    // El worker puede haberse cerrado ya.
  }
}

interface RenderOptions {
  dpi?: number;
  maxWidth?: number;
  maxPixels?: number;
  type?: 'image/jpeg' | 'image/png';
  quality?: number;
}

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(
  canvas: AnyCanvas,
  type: 'image/jpeg' | 'image/png',
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }

  const htmlCanvas = canvas as HTMLCanvasElement;
  return new Promise<Blob>((resolve, reject) => {
    htmlCanvas.toBlob(
      (blob: Blob | null) => {
        if (blob) resolve(blob);
        else reject(new Error('El navegador no pudo generar la imagen.'));
      },
      type,
      quality,
    );
  });
}

/**
 * Rasteriza una página a JPEG/PNG. El canvas se limita en píxeles para no
 * agotar la memoria de Safari/iOS con páginas grandes.
 */
export async function renderPageToBlob(
  page: PDFPageProxy,
  options: RenderOptions = {},
): Promise<RenderedPage> {
  const {
    dpi = 150,
    maxWidth,
    maxPixels = 12_000_000,
    type = 'image/jpeg',
    quality = 0.85,
  } = options;

  const baseViewport = page.getViewport({ scale: 1 });
  let scale = maxWidth
    ? Math.min(maxWidth / baseViewport.width, 4)
    : Math.max(0.1, dpi / 72);

  const pixels = baseViewport.width * scale * baseViewport.height * scale;
  if (pixels > maxPixels) {
    scale *= Math.sqrt(maxPixels / pixels);
  }

  const viewport = page.getViewport({ scale });
  const width = Math.max(1, Math.ceil(viewport.width));
  const height = Math.max(1, Math.ceil(viewport.height));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: false }) as AnyContext | null;

  if (!context) {
    throw new PdfProcessingError('UNSUPPORTED', 'Tu navegador no puede dibujar PDF en canvas.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  try {
    await page
      .render({
        canvas: null,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
        background: '#ffffff',
      })
      .promise;

    const blob = await canvasToBlob(canvas, type, quality);
    return {
      blob,
      width,
      height,
      pageWidth: baseViewport.width,
      pageHeight: baseViewport.height,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function renderFirstPageThumbnail(file: Blob, maxWidth = 220): Promise<Blob> {
  const document = await openPdf(file);
  try {
    const page = await document.getPage(1);
    try {
      const rendered = await renderPageToBlob(page, {
        maxWidth,
        maxPixels: 2_000_000,
        quality: 0.78,
      });
      return rendered.blob;
    } finally {
      page.cleanup();
    }
  } finally {
    await closePdf(document);
  }
}
