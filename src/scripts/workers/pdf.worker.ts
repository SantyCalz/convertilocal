/**
 * src/scripts/workers/pdf.worker.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { PDFDocument, PDFObject, PDFRef } from 'pdf-lib';
import { PdfProcessingError } from '@/types/pdf';
import type { PdfJobRequest, PdfOutput, PdfRasterPage, PdfWorkerMessage } from '@/types/pdf';
import type { ProcessorOptions } from '@/types/processor';
import { fitImage, pageDimensions, parseHexColor, textPosition } from '@/scripts/core/pdf/geometry';
import { flattenPageRanges, parsePageRanges } from '@/scripts/core/pdf/ranges';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PdfJobRequest>) => void) | null;
  postMessage: (message: PdfWorkerMessage) => void;
};

let currentJobId: string | null = null;

function postWorkerError(id: string | null, message: string): void {
  if (!id) return;
  scope.postMessage({
    type: 'error',
    id,
    code: 'WORKER_FAILED',
    message,
  });
}

self.addEventListener('error', (event) => {
  postWorkerError(currentJobId, event.message || 'Error no capturado en el worker de PDF.');
});

self.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Error no capturado');
  postWorkerError(currentJobId, reason);
});

const MAX_PROCESS_PAGES = 300;
const MAX_RASTER_PAGES = 100;

function stringOption(options: ProcessorOptions, key: string, fallback = ''): string {
  const value = options[key];
  return typeof value === 'string' ? value : fallback;
}

function numberOption(options: ProcessorOptions, key: string, fallback: number): number {
  const value = options[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function booleanOption(options: ProcessorOptions, key: string, fallback: boolean): boolean {
  const value = options[key];
  return typeof value === 'boolean' ? value : fallback;
}

function baseName(name: string, fallback = 'documento'): string {
  const clean = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N}._ -]+/gu, '')
    .trim()
    .slice(0, 80);
  return clean || fallback;
}

function output(bytes: Uint8Array, name: string): PdfOutput {
  const buffer = new Uint8Array(bytes.byteLength);
  buffer.set(bytes);

  return {
    blob: new Blob([buffer.buffer], { type: 'application/pdf' }),
    name,
    type: 'application/pdf',
  };
}

function mapLoadError(error: unknown): PdfProcessingError {
  if (error instanceof PdfProcessingError) return error;
  const message = error instanceof Error ? error.message : '';
  if (/encrypt|password/i.test(message)) {
    return new PdfProcessingError(
      'ENCRYPTED_PDF',
      'Este PDF está protegido con contraseña. Esta herramienta todavía no puede abrirlo.',
    );
  }
  if (/pdf header|invalid|parse|expected|corrupt|damaged/i.test(message)) {
    return new PdfProcessingError('INVALID_PDF', 'El archivo no parece un PDF válido o está dañado.');
  }
  return new PdfProcessingError(
    'PROCESSING_FAILED',
    message || 'No pudimos leer el PDF. Prueba con otro archivo.',
  );
}

async function loadDocument(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    throw mapLoadError(error);
  }
}

async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function checkPageCount(total: number, limit = MAX_PROCESS_PAGES): void {
  if (total > limit) {
    throw new PdfProcessingError(
      'TOO_MANY_PAGES',
      `Este PDF tiene ${total} páginas. El límite de esta herramienta es ${limit}; divídelo primero.`,
    );
  }
}

function refKey(ref: PDFRef): string {
  return `${ref.objectNumber}:${ref.generationNumber}`;
}

/**
 * Elimina objetos indirectos que ya no son alcanzables desde el trailer.
 * No toca páginas, fuentes, imágenes ni formularios referenciados.
 */
async function garbageCollect(document: PDFDocument): Promise<void> {
  const {
    PDFArray,
    PDFDict,
    PDFRef,
    PDFStream,
  } = await import('pdf-lib');

  const context = document.context;
  const reachableRefs = new Set<string>();
  const visited = new WeakSet<object>();
  const queue: PDFObject[] = [];

  const enqueue = (value: unknown): void => {
    if (value instanceof PDFRef) {
      const key = refKey(value);
      if (!reachableRefs.has(key)) {
        reachableRefs.add(key);
        const object = context.lookup(value);
        if (object) queue.push(object);
      }
    } else if (value && typeof value === 'object') {
      queue.push(value as PDFObject);
    }
  };

  enqueue(context.trailerInfo.Root);
  enqueue(context.trailerInfo.Info);
  enqueue(context.trailerInfo.Encrypt);

  while (queue.length > 0) {
    const object = queue.pop();
    if (!object || visited.has(object)) continue;
    visited.add(object);

    if (object instanceof PDFDict) {
      for (const [, value] of object.entries()) enqueue(value);
    } else if (object instanceof PDFArray) {
      for (const value of object.asArray()) enqueue(value);
    } else if (object instanceof PDFStream) {
      for (const [, value] of object.dict.entries()) enqueue(value);
    }
  }

  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachableRefs.has(refKey(ref))) context.delete(ref);
  }
}

async function removeMetadata(document: PDFDocument): Promise<void> {
  const { PDFName, PDFRef } = await import('pdf-lib');
  document.catalog.delete(PDFName.of('Metadata'));

  const info = document.context.trailerInfo.Info;
  if (info instanceof PDFRef) document.context.delete(info);
  document.context.trailerInfo.Info = undefined;
}

async function saveDocument(document: PDFDocument): Promise<Uint8Array> {
  return document.save({ useObjectStreams: true, addDefaultPage: false });
}

async function merge(
  files: File[],
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  if (files.length < 2) {
    throw new PdfProcessingError('NO_PAGES', 'Añade al menos dos PDF para unirlos.');
  }

  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();
  let totalPages = 0;

  for (let index = 0; index < files.length; index += 1) {
    const source = await loadDocument(await fileBytes(files[index]!));
    checkPageCount(source.getPageCount());
    totalPages += source.getPageCount();
    if (totalPages > MAX_PROCESS_PAGES) {
      throw new PdfProcessingError(
        'TOO_MANY_PAGES',
        `El resultado tendría ${totalPages} páginas. El límite es ${MAX_PROCESS_PAGES}.`,
      );
    }
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    report(((index + 1) / files.length) * 90);
  }

  if (merged.getPageCount() === 0) {
    throw new PdfProcessingError('NO_PAGES', 'Los PDF no contienen páginas que se puedan unir.');
  }

  const bytes = await saveDocument(merged);
  report(100);
  return [output(bytes, 'documento-unido.pdf')];
}

async function split(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  const file = files[0];
  if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para dividir.');

  const { PDFDocument } = await import('pdf-lib');
  const source = await loadDocument(await fileBytes(file));
  const total = source.getPageCount();
  checkPageCount(total);

  const groups = parsePageRanges(stringOption(options, 'pages'), total);
  const mode = stringOption(options, 'mode', 'extract');
  const name = baseName(file.name);
  const outputs: PdfOutput[] = [];

  const createFromPages = async (pages: number[]): Promise<Uint8Array> => {
    const target = await PDFDocument.create();
    const copied = await target.copyPages(
      source,
      pages.map((page) => page - 1),
    );
    copied.forEach((page) => target.addPage(page));
    return saveDocument(target);
  };

  if (mode === 'extract') {
    const pages = flattenPageRanges(groups);
    const bytes = await createFromPages(pages);
    outputs.push(output(bytes, `${name}-paginas-seleccionadas.pdf`));
  } else if (mode === 'each') {
    const pages = flattenPageRanges(groups);
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]!;
      const bytes = await createFromPages([page]);
      outputs.push(output(bytes, `${name}-pagina-${String(page).padStart(3, '0')}.pdf`));
      report(((index + 1) / pages.length) * 95);
    }
  } else {
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index]!;
      const bytes = await createFromPages(group.pages);
      const suffix = groups.length === 1 ? group.label : `${index + 1}-${group.label}`;
      outputs.push(output(bytes, `${name}-${suffix}.pdf`));
      report(((index + 1) / groups.length) * 95);
    }
  }

  if (outputs.length === 0) {
    throw new PdfProcessingError('NO_PAGES', 'No se seleccionó ninguna página.');
  }

  report(100);
  return outputs;
}

function parseOrder(value: string, total: number): number[] {
  if (!value.trim()) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((page) => Number.isInteger(page));

  if (pages.length !== total || new Set(pages).size !== total) {
    throw new PdfProcessingError(
      'INVALID_RANGE',
      'El orden de páginas no es válido: deben aparecer todas las páginas una sola vez.',
    );
  }

  for (const page of pages) {
    if (page < 1 || page > total) {
      throw new PdfProcessingError('INVALID_RANGE', 'El orden contiene una página que no existe.');
    }
  }

  return pages;
}

function parseRotations(value: string, total: number): number[] {
  const rotations = Array.from({ length: total }, () => 0);
  if (!value.trim()) return rotations;

  const values = value.split(',').map((item) => Number(item.trim()));
  values.forEach((rotation, index) => {
    if (index < total && Number.isFinite(rotation)) {
      rotations[index] = ((rotation % 360) + 360) % 360;
    }
  });
  return rotations;
}

async function organize(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  const file = files[0];
  if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para organizar.');

  const { PDFDocument, degrees } = await import('pdf-lib');
  const source = await loadDocument(await fileBytes(file));
  const total = source.getPageCount();
  checkPageCount(total);

  const mode = stringOption(options, 'mode', 'rotate');
  const order = parseOrder(stringOption(options, 'pageOrder'), total);
  const rotations = parseRotations(stringOption(options, 'pageRotations'), total);
  const isIdentity = order.every((page, index) => page === index + 1);
  const name = baseName(file.name);
  const warnings: string[] = [];

  if (mode === 'rotate' && isIdentity) {
    source.getPages().forEach((page, index) => {
      const delta = rotations[index] ?? 0;
      if (delta !== 0) page.setRotation(degrees((page.getRotation().angle + delta) % 360));
    });
    const bytes = await saveDocument(source);
    report(100);
    return [output(bytes, `${name}-rotado.pdf`)];
  }

  const target = await PDFDocument.create();
  const copied = await target.copyPages(
    source,
    order.map((page) => page - 1),
  );
  copied.forEach((page, index) => {
    const originalIndex = order[index]! - 1;
    const delta = rotations[originalIndex] ?? 0;
    if (delta !== 0) page.setRotation(degrees((page.getRotation().angle + delta) % 360));
    target.addPage(page);
  });

  if (mode === 'reorder') {
    warnings.push(
      'Al reordenar se reconstruye el documento: marcadores y formularios pueden no conservarse.',
    );
  }

  const bytes = await saveDocument(target);
  report(100);
  return [output(bytes, `${name}-${mode === 'reorder' ? 'reordenado' : 'organizado'}.pdf`)];
}

async function createCanvasBlob(
  bitmap: ImageBitmap,
  type: 'image/jpeg' | 'image/png',
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new PdfProcessingError(
      'UNSUPPORTED',
      'Tu navegador no puede convertir imágenes dentro del procesador PDF.',
    );
  }

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d', { alpha: type === 'image/png' });
  if (!context) {
    throw new PdfProcessingError('UNSUPPORTED', 'No se pudo crear el lienzo de la imagen.');
  }

  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, bitmap.width, bitmap.height);
  }
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  return canvas.convertToBlob({ type, quality });
}

async function imageToPdf(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  if (files.length === 0) {
    throw new PdfProcessingError('NO_PAGES', 'Añade al menos una imagen.');
  }

  const { PDFDocument, rgb } = await import('pdf-lib');
  const document = await PDFDocument.create();
  const pageSize = stringOption(options, 'pageSize', 'a4') as 'a4' | 'letter' | 'auto';
  const orientation = stringOption(options, 'orientation', 'auto') as
    | 'auto'
    | 'portrait'
    | 'landscape';
  const margin = Math.max(0, numberOption(options, 'margin', 24));
  const rawQuality = numberOption(options, 'quality', 0.88);
  const quality = Math.max(0.3, Math.min(1, rawQuality > 1 ? rawQuality / 100 : rawQuality));
  const background = parseHexColor(stringOption(options, 'background', '#ffffff'));

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      throw new PdfProcessingError(
        'UNSUPPORTED',
        `No pudimos leer la imagen "${file.name}". Prueba a convertirla a JPG o PNG primero.`,
      );
    }

    try {
      const format =
        file.type === 'image/jpeg' ? 'image/jpeg' : file.type === 'image/png' ? 'image/png' : 'image/png';
      const blob = await createCanvasBlob(bitmap, format, quality);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const embedded =
        format === 'image/jpeg' ? await document.embedJpg(bytes) : await document.embedPng(bytes);
      const dimensions = pageDimensions(pageSize, orientation, bitmap.width, bitmap.height);
      const page = document.addPage([dimensions.width, dimensions.height]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
        color: rgb(background.r, background.g, background.b),
      });
      const fit = fitImage(
        dimensions.width,
        dimensions.height,
        bitmap.width,
        bitmap.height,
        margin,
      );
      page.drawImage(embedded, {
        x: fit.x,
        y: fit.y,
        width: fit.width,
        height: fit.height,
      });
    } finally {
      bitmap.close();
    }

    report(((index + 1) / files.length) * 95);
  }

  const bytes = await saveDocument(document);
  report(100);
  return [output(bytes, 'imagenes-a-pdf.pdf')];
}

async function watermark(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  const file = files[0];
  if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para marcar.');

  const text = stringOption(options, 'text', 'CONFIDENCIAL').trim();
  if (!text) {
    throw new PdfProcessingError('PROCESSING_FAILED', 'Escribe el texto de la marca de agua.');
  }

  const { StandardFonts, degrees, rgb } = await import('pdf-lib');
  const document = await loadDocument(await fileBytes(file));
  const total = document.getPageCount();
  checkPageCount(total);

  const font = await document.embedFont(StandardFonts.Helvetica);
  const size = Math.max(8, numberOption(options, 'fontSize', 48));
  const rawOpacity = numberOption(options, 'opacity', 0.18);
  const opacity = Math.max(0.02, Math.min(1, rawOpacity > 1 ? rawOpacity / 100 : rawOpacity));
  const angle = numberOption(options, 'angle', 45);
  const position = stringOption(options, 'position', 'center');
  const margin = Math.max(0, numberOption(options, 'margin', 24));
  const color = parseHexColor(stringOption(options, 'color', '#64748b'));
  const textWidth = font.widthOfTextAtSize(text, size);
  const textHeight = font.heightAtSize(size);

  document.getPages().forEach((page, index) => {
    const { width, height } = page.getSize();
    const point = textPosition(
      width,
      height,
      textWidth,
      textHeight,
      position as Parameters<typeof textPosition>[4],
      margin,
    );
    page.drawText(text, {
      x: point.x,
      y: point.y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle),
    });
    report(((index + 1) / total) * 95);
  });

  const bytes = await saveDocument(document);
  report(100);
  return [output(bytes, `${baseName(file.name)}-marca-agua.pdf`)];
}

function formatPageNumber(
  format: string,
  number: number,
  total: number,
): string {
  switch (format) {
    case 'n-of-total':
      return `${number} / ${total}`;
    case 'page-n':
      return `Página ${number}`;
    case 'page-n-of-total':
      return `Página ${number} de ${total}`;
    case 'n':
    default:
      return String(number);
  }
}

async function pageNumbers(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<PdfOutput[]> {
  const file = files[0];
  if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para numerar.');

  const { StandardFonts, rgb } = await import('pdf-lib');
  const document = await loadDocument(await fileBytes(file));
  const total = document.getPageCount();
  checkPageCount(total);

  const font = await document.embedFont(StandardFonts.Helvetica);
  const fontSize = Math.max(6, numberOption(options, 'fontSize', 10));
  const margin = Math.max(6, numberOption(options, 'margin', 24));
  const startAt = Math.max(0, Math.round(numberOption(options, 'startAt', 1)));
  const skipFirst = booleanOption(options, 'skipFirst', false);
  const format = stringOption(options, 'format', 'n');
  const position = stringOption(options, 'position', 'bottom-center');
  const color = parseHexColor('#334155');
  let number = startAt;

  document.getPages().forEach((page, index) => {
    if (skipFirst && index === 0) {
      report(((index + 1) / total) * 95);
      return;
    }

    const text = formatPageNumber(format, number, total);
    number += 1;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    const point = textPosition(
      width,
      height,
      textWidth,
      textHeight,
      position as Parameters<typeof textPosition>[4],
      margin,
    );
    page.drawText(text, {
      x: point.x,
      y: point.y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    report(((index + 1) / total) * 95);
  });

  const bytes = await saveDocument(document);
  report(100);
  return [output(bytes, `${baseName(file.name)}-numerado.pdf`)];
}

async function compressOptimize(
  files: File[],
  options: ProcessorOptions,
  report: (percent: number) => void,
): Promise<{ outputs: PdfOutput[]; warnings: string[] }> {
  const file = files[0];
  if (!file) throw new PdfProcessingError('NO_PAGES', 'Añade un PDF para optimizar.');

  const document = await loadDocument(await fileBytes(file));
  checkPageCount(document.getPageCount());
  if (booleanOption(options, 'removeMetadata', true)) await removeMetadata(document);
  report(35);
  try {
    await garbageCollect(document);
  } catch {
    // La limpieza estructural es una optimización: no debe impedir guardar el PDF.
  }
  report(65);
  const bytes = await saveDocument(document);
  report(100);

  const warnings: string[] =
    bytes.byteLength >= file.size
      ? ['Este PDF ya estaba muy optimizado: la limpieza no redujo el tamaño.']
      : [];

  return { outputs: [output(bytes, `${baseName(file.name)}-optimizado.pdf`)], warnings };
}

async function compressRaster(
  files: File[],
  pages: PdfRasterPage[],
  report: (percent: number) => void,
): Promise<{ outputs: PdfOutput[]; warnings: string[] }> {
  if (pages.length === 0) {
    throw new PdfProcessingError('NO_PAGES', 'No se pudo rasterizar ninguna página.');
  }
  if (pages.length > MAX_RASTER_PAGES) {
    throw new PdfProcessingError(
      'TOO_MANY_PAGES',
      `El límite para rasterizar es ${MAX_RASTER_PAGES} páginas. Divide el PDF primero.`,
    );
  }

  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.create();

  for (let index = 0; index < pages.length; index += 1) {
    const item = pages[index]!;
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    const image =
      item.blob.type === 'image/png'
        ? await document.embedPng(bytes)
        : await document.embedJpg(bytes);
    const page = document.addPage([item.pageWidth, item.pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: item.pageWidth,
      height: item.pageHeight,
    });
    report(((index + 1) / pages.length) * 95);
  }

  const bytes = await saveDocument(document);
  const original = files[0]?.size ?? 0;
  report(100);

  return {
    outputs: [output(bytes, 'documento-comprimido.pdf')],
    warnings:
      original > 0 && bytes.byteLength >= original
        ? ['El rasterizado no redujo el peso; el PDF original ya era ligero o vectorial.']
        : [],
  };
}

async function run(request: PdfJobRequest): Promise<{ outputs: PdfOutput[]; warnings: string[] }> {
  const report = (percent: number): void => {
    scope.postMessage({ type: 'progress', id: request.id, percent });
  };

  switch (request.op) {
    case 'merge':
      return { outputs: await merge(request.files, report), warnings: [] };
    case 'split':
      return { outputs: await split(request.files, request.options, report), warnings: [] };
    case 'organize':
      return { outputs: await organize(request.files, request.options, report), warnings: [] };
    case 'image-to-pdf':
      return { outputs: await imageToPdf(request.files, request.options, report), warnings: [] };
    case 'watermark':
      return { outputs: await watermark(request.files, request.options, report), warnings: [] };
    case 'page-numbers':
      return { outputs: await pageNumbers(request.files, request.options, report), warnings: [] };
    case 'compress-optimize':
      return compressOptimize(request.files, request.options, report);
    case 'compress-raster':
      return compressRaster(request.files, request.pages ?? [], report);
    default:
      throw new PdfProcessingError('UNSUPPORTED', 'Esta operación de PDF todavía no está disponible.');
  }
}

scope.onmessage = (event: MessageEvent<PdfJobRequest>): void => {
  const request = event.data;
  if (!request?.id) return;

  currentJobId = request.id;
  run(request)
    .then(({ outputs, warnings }) => {
      if (!outputs || outputs.length === 0 || outputs.some((item) => !(item.blob instanceof Blob) || item.blob.size === 0)) {
        throw new PdfProcessingError('PROCESSING_FAILED', 'El procesador no generó un PDF válido.');
      }
      scope.postMessage({ type: 'result', id: request.id, outputs, warnings });
    })
    .catch((error: unknown) => {
      const known = error instanceof PdfProcessingError;
      scope.postMessage({
        type: 'error',
        id: request.id,
        code: known ? error.code : 'PROCESSING_FAILED',
        message: known
          ? error.message
          : 'No pudimos procesar el PDF. Prueba con otro archivo o una copia más ligera.',
      });
    })
    .finally(() => {
      currentJobId = null;
    });
};
