/**
 * src/lib/doc/html-print.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import DOMPurify from 'dompurify';

/**
 * Motor de HTML a PDF.
 *
 * Dos modos:
 *   - Vectorial (por defecto): el HTML se renderiza en un iframe aislado y se
 *     lanza `window.print()`. El texto sigue siendo seleccionable y el
 *     documento conserva su tipografía.
 *   - Rasterizado: se captura con `html2canvas` y se arma el PDF con `jsPDF`
 *     cortando la imagen por páginas. El texto deja de ser seleccionable.
 *
 * El HTML se sanea siempre antes de renderizarlo: se eliminan scripts,
 * marcos y formularios, y se quitan todas las URL externas para que el
 * proceso no haga peticiones a terceros.
 */

export interface SanitizeReport {
  /** HTML saneado, listo para renderizar. */
  html: string;
  /** Etiquetas de contenido activo que se eliminaron. */
  removedActiveTags: number;
  /** Atributos con URL externa que se eliminaron. */
  removedExternalUrls: number;
  /** Bloques `<style>` conservados (ya saneados). */
  keptStyles: number;
  /** Avisos legibles para la interfaz. */
  warnings: string[];
}

export interface PrintOptions {
  /** Título del documento (se usa en la pestaña de impresión). */
  title?: string;
  /** Tamaño de página: A4 o Carta. */
  pageSize?: 'a4' | 'letter';
  /** Margen de impresión en CSS. */
  margin?: string;
  /** Fuente base del documento. */
  fontFamily?: string;
}

export interface RasterOptions extends PrintOptions {
  /** Escala de captura: 1 = 96 ppp. */
  scale?: number;
  /** Calidad JPEG de las páginas (0-1). */
  quality?: number;
}

/* ------------------------------------------------------------------ *
 * Saneado
 * ------------------------------------------------------------------ */

/** Etiquetas que ejecutan código o cargan documentos externos. */
const FORBIDDEN_TAGS = [
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'fieldset',
  'label',
  'base',
  'meta',
  'link',
  'noscript',
  'template',
  'svg',
  'math',
  'audio',
  'video',
  'source',
  'track',
  'portal',
  'marquee',
  'dialog',
];

/** Atributos que pueden apuntar a un recurso externo. */
const URL_ATTRIBUTES = [
  'src',
  'srcset',
  'href',
  'xlink:href',
  'poster',
  'data',
  'action',
  'formaction',
  'background',
  'ping',
  'longdesc',
  'cite',
  'usemap',
  'profile',
  'codebase',
];

/** URI que no puede provocar una petición de red. */
const SAFE_URI = /^(?:data:|blob:|#|\/|\.\/|\.\.\/)/i;
const EXTERNAL_URI = /^(?:https?:)?\/\//i;

/**
 * Limpia el CSS: fuera `@import`, `url()` que no sea `data:`/`blob:`,
 * `expression()` y `javascript:`.
 */
export function sanitizeCss(css: string): string {
  return css
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/url\(\s*(['"]?)(?!data:|blob:)[^)]*\)/gi, 'url(none)')
    .replace(/expression\s*\(/gi, 'blocked(')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/behavior\s*:/gi, 'blocked-behavior:')
    .replace(/<\/?[a-z][^>]*>/gi, '');
}

/**
 * Sanea el HTML: elimina contenido activo, quita las URL externas y
 * conserva solo estilos locales.
 */
export function sanitizeHtml(input: string): SanitizeReport {
  const warnings: string[] = [];

  /* 1. Los estilos se extraen aparte: DOMPurify vacía el contenido de
        <style> y aquí necesitamos conservarlo (saneado). */
  const styles: string[] = [];
  let source = input.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, _attrs, css: string) => {
    styles.push(css);
    return '';
  });

  /* 2. DOMPurify elimina scripts, marcos, formularios y manejadores. */
  const before = source.length;
  source = DOMPurify.sanitize(source, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ['srcdoc', 'http-equiv', 'ping'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:|blob:|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    KEEP_CONTENT: true,
  });

  /* 3. Se recorre el DOM resultante para quitar URL externas. */
  const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  const body = parsed.body;
  let removedExternalUrls = 0;

  for (const element of Array.from(body.querySelectorAll('*'))) {
    for (const attribute of URL_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const value = element.getAttribute(attribute) ?? '';
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (SAFE_URI.test(trimmed) && !EXTERNAL_URI.test(trimmed)) continue;

      // data: y blob: sí se conservan (no salen a la red).
      if (/^(data:|blob:)/i.test(trimmed)) continue;

      element.removeAttribute(attribute);
      removedExternalUrls += 1;
    }

    const inline = element.getAttribute('style');
    if (inline) {
      const cleaned = sanitizeCss(inline);
      if (cleaned !== inline) element.setAttribute('style', cleaned);
    }
  }

  /* 4. Los estilos saneados se vuelven a insertar. */
  let keptStyles = 0;
  for (const css of styles) {
    const cleaned = sanitizeCss(css);
    if (!cleaned.trim()) continue;
    const style = parsed.createElement('style');
    style.textContent = cleaned;
    body.append(style);
    keptStyles += 1;
  }

  if (removedExternalUrls > 0) {
    warnings.push(
      `Se han quitado ${removedExternalUrls} enlace(s) externo(s) para que el documento no haga peticiones a otros sitios.`,
    );
  }
  if (keptStyles > 0) {
    warnings.push(
      'Los estilos externos (@import) se han eliminado: el documento usará solo los estilos que venías escritos.',
    );
  }
  if (before > 0 && source.length === 0) {
    warnings.push('El HTML no tenía contenido después de limpiarlo.');
  }

  return {
    html: body.innerHTML,
    removedActiveTags: FORBIDDEN_TAGS.length,
    removedExternalUrls,
    keptStyles,
    warnings,
  };
}

/* ------------------------------------------------------------------ *
 * Renderizado aislado
 * ------------------------------------------------------------------ */

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
};

/**
 * Crea un iframe fuera de pantalla con el documento dentro.
 *
 * El iframe aísla el CSS del HTML pegado del resto de la página: ni las
 * reglas del visitante ni las nuestras affects al documento renderizado.
 */
function createIsolatedFrame(html: string, options: PrintOptions): HTMLIFrameElement {
  const size = PAGE_SIZES[options.pageSize ?? 'a4'] ?? PAGE_SIZES.a4!;
  const margin = options.margin ?? '12mm';

  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Vista previa del documento');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${size.width}px`,
    `height:${size.height}px`,
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');

  document.body.append(frame);

  const doc = frame.contentDocument;
  if (!doc) throw new Error('No se pudo crear el documento aislado.');

  // Se construye con DOM APIs en lugar de document.write, que está obsoleto.
  doc.documentElement.innerHTML = '<head><meta charset="utf-8"></head><body></body></html>';

  // @page vive en el documento: es la regla que controla el papel.
  const pageStyle = doc.createElement('style');
  pageStyle.textContent = `@page { size: ${options.pageSize ?? 'a4'}; margin: ${margin}; }`;
  doc.head.append(pageStyle);

  const style = doc.createElement('style');
  style.textContent = [
    'html, body { margin: 0; padding: 0; background: #ffffff; }',
    `body { font-family: ${options.fontFamily ?? 'system-ui, -apple-system, Segoe UI, sans-serif'}; color: #111827; }`,
    'img, table, pre, blockquote { max-width: 100%; }',
    'pre { white-space: pre-wrap; word-break: break-word; }',
    'table { border-collapse: collapse; }',
    '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  ].join('\n');
  doc.head.append(style);

  const title = doc.createElement('title');
  title.textContent = options.title ?? 'Documento';
  doc.head.append(title);

  doc.body.innerHTML = html;

  return frame;
}

/** Espera a que las imágenes del documento terminen de cargar. */
async function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 3000);
      });
    }),
  );
}

/**
 * Modo A: abre el diálogo de impresión del navegador.
 *
 * Se emite el evento `convertilocal:print` (cancelable) antes de imprimir:
 * así las pruebas pueden interceptarlo sin abrir un diálogo de verdad.
 */
export async function printHtmlAsPdf(
  html: string,
  options: PrintOptions = {},
): Promise<{ printed: boolean }> {
  const frame = createIsolatedFrame(html, options);
  const doc = frame.contentDocument!;

  try {
    await waitForImages(doc);
    if (doc.fonts?.ready) await doc.fonts.ready;

    const event = new CustomEvent('convertilocal:print', {
      detail: { mode: 'vector', title: options.title ?? 'Documento' },
      cancelable: true,
    });
    window.dispatchEvent(event);

    if (event.defaultPrevented) return { printed: false };

    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    return { printed: true };
  } finally {
    setTimeout(() => frame.remove(), 1000);
  }
}

/**
 * Modo B: rasteriza el documento y arma el PDF cortando la imagen.
 *
 * El texto no será seleccionable y el archivo suele pesar más.
 */
export async function rasterizeHtmlToPdf(
  html: string,
  options: RasterOptions = {},
): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const scale = Math.max(0.5, Math.min(3, options.scale ?? 2));
  const quality = Math.max(0.4, Math.min(1, options.quality ?? 0.92));
  const frame = createIsolatedFrame(html, options);
  const doc = frame.contentDocument!;

  try {
    await waitForImages(doc);
    if (doc.fonts?.ready) await doc.fonts.ready;

    const canvas = await html2canvas(doc.documentElement as unknown as HTMLElement, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: false,
      allowTaint: false,
      logging: false,
      imageTimeout: 0,
      windowWidth: doc.documentElement.scrollWidth,
      windowHeight: doc.documentElement.scrollHeight,
    });

    const pdf = new jsPDF({
      unit: 'pt',
      format: options.pageSize ?? 'a4',
      orientation: 'portrait',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    const data = canvas.toDataURL('image/jpeg', quality);

    let remaining = imageHeight;
    let offset = 0;
    pdf.addImage(data, 'JPEG', 0, offset, pageWidth, imageHeight);
    remaining -= pageHeight;

    while (remaining > 0) {
      offset = remaining - imageHeight;
      pdf.addPage();
      pdf.addImage(data, 'JPEG', 0, offset, pageWidth, imageHeight);
      remaining -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    frame.remove();
  }
}
