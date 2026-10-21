/**
 * src/scripts/core/pdf/preview.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { closePdf, openPdf, renderPageToBlob } from './pdfjs';

type PreviewMode = 'merge' | 'pages' | 'organize';

export interface PdfPreviewController {
  update(files: File[]): Promise<void>;
  destroy(): void;
}

interface PreviewContext {
  root: HTMLElement;
  mode: PreviewMode;
  container: HTMLElement;
  generation: number;
  doc: PDFDocumentProxy | null;
  urls: string[];
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function revokeUrls(context: PreviewContext): void {
  for (const url of context.urls) URL.revokeObjectURL(url);
  context.urls = [];
}

function objectUrl(context: PreviewContext, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  context.urls.push(url);
  return url;
}

function hiddenField(root: HTMLElement, id: string): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>(`[data-fp-option="${id}"]`);
}

function notifyChanged(root: HTMLElement): void {
  root.dispatchEvent(new CustomEvent('convertilocal:options-changed', { bubbles: true }));
}

function previewShell(
  context: PreviewContext,
  title: string,
  note: string,
): { section: HTMLElement; grid: HTMLElement } {
  const section = element('section', 'mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4');
  const heading = element('div', 'flex flex-wrap items-baseline justify-between gap-2');
  heading.append(
    element('h3', 'text-xs font-semibold text-slate-800', title),
    element('p', 'text-[11px] text-slate-500', note),
  );
  const grid = element('div', 'mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3');
  section.append(heading, grid);
  context.container.replaceChildren(section);
  context.container.hidden = false;
  return { section, grid };
}

function loading(context: PreviewContext, message: string): void {
  const section = element('section', 'mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3');
  const row = element('div', 'flex items-center gap-2 text-xs text-slate-500');
  const spinner = element('span', 'h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600');
  row.append(spinner, element('span', '', message));
  section.append(row);
  context.container.replaceChildren(section);
  context.container.hidden = false;
}

function previewError(context: PreviewContext, message: string): void {
  const section = element(
    'section',
    'mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800',
  );
  section.textContent = message;
  context.container.replaceChildren(section);
  context.container.hidden = false;
}

function cardShell(): { card: HTMLElement; thumb: HTMLElement; body: HTMLElement } {
  const card = element('div', 'overflow-hidden rounded-xl border border-slate-200 bg-white');
  const thumb = element('div', 'relative flex aspect-[3/4] items-center justify-center bg-slate-50');
  const body = element('div', 'p-2');
  card.append(thumb, body);
  return { card, thumb, body };
}

function thumbnailImage(context: PreviewContext, blob: Blob, alt: string): HTMLImageElement {
  const image = element('img', 'h-full w-full object-contain p-1.5 transition-transform duration-200');
  image.src = objectUrl(context, blob);
  image.alt = alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  return image;
}

async function renderThumbnail(page: PDFPageProxy): Promise<Blob> {
  const rendered = await renderPageToBlob(page, {
    maxWidth: 220,
    maxPixels: 2_000_000,
    quality: 0.74,
  });
  return rendered.blob;
}

function moveButton(label: string, symbol: string, disabled: boolean): HTMLButtonElement {
  const button = element(
    'button',
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30',
    symbol,
  );
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  return button;
}

async function updateMerge(context: PreviewContext, files: File[]): Promise<void> {
  const generation = context.generation;
  loading(context, 'Preparando miniaturas de los PDF…');

  const items: Array<{ file: File; pages: number; thumb: Blob }> = [];
  for (const file of files) {
    if (generation !== context.generation) return;
    const document = await openPdf(file);
    try {
      const page = await document.getPage(1);
      try {
        items.push({ file, pages: document.numPages, thumb: await renderThumbnail(page) });
      } finally {
        page.cleanup();
      }
    } finally {
      await closePdf(document);
    }
  }

  if (generation !== context.generation) return;
  revokeUrls(context);

  const totalPages = items.reduce((sum, item) => sum + item.pages, 0);
  const { grid } = previewShell(
    context,
    'Orden de los PDF',
    `${items.length} archivo(s) · ${totalPages} página(s) en total`,
  );

  items.forEach((item, index) => {
    const { card, thumb, body } = cardShell();
    thumb.append(thumbnailImage(context, item.thumb, `Primera página de ${item.file.name}`));

    const badge = element(
      'span',
      'absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white',
      String(index + 1),
    );
    thumb.append(badge);

    const name = element('p', 'truncate text-[11px] font-semibold text-slate-800', item.file.name);
    name.title = item.file.name;
    const meta = element('p', 'mt-0.5 text-[10px] text-slate-400', `${item.pages} página(s)`);
    body.append(name, meta);

    const controls = element('div', 'mt-1.5 flex items-center gap-1');
    const up = moveButton(`Mover ${item.file.name} hacia arriba`, '↑', index === 0);
    const down = moveButton(`Mover ${item.file.name} hacia abajo`, '↓', index === items.length - 1);
    up.addEventListener('click', () => {
      context.root.dispatchEvent(
        new CustomEvent('convertilocal:reorder-files', {
          bubbles: true,
          detail: { from: index, to: index - 1 },
        }),
      );
    });
    down.addEventListener('click', () => {
      context.root.dispatchEvent(
        new CustomEvent('convertilocal:reorder-files', {
          bubbles: true,
          detail: { from: index, to: index + 1 },
        }),
      );
    });
    controls.append(up, down);
    body.append(controls);

    grid.append(card);
  });
}

async function updatePages(context: PreviewContext, file: File): Promise<void> {
  const generation = context.generation;
  loading(context, 'Preparando miniaturas de las páginas…');
  const document = await openPdf(file);

  try {
    const total = document.numPages;
    const visible = Math.min(24, total);
    const items: Array<{ page: number; thumb: Blob }> = [];

    for (let pageNumber = 1; pageNumber <= visible; pageNumber += 1) {
      if (generation !== context.generation) return;
      const page = await document.getPage(pageNumber);
      try {
        items.push({ page: pageNumber, thumb: await renderThumbnail(page) });
      } finally {
        page.cleanup();
      }
    }

    if (generation !== context.generation) return;
    revokeUrls(context);
    const note =
      total > visible
        ? `${total} páginas · mostrando las primeras ${visible}`
        : `${total} página(s)`;
    const { grid } = previewShell(context, 'Vista previa del documento', note);

    for (const item of items) {
      const { card, thumb, body } = cardShell();
      thumb.append(thumbnailImage(context, item.thumb, `Página ${item.page}`));
      const badge = element(
        'span',
        'absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white',
        `Página ${item.page}`,
      );
      thumb.append(badge);
      body.append(element('p', 'text-[11px] font-medium text-slate-500', `Página ${item.page}`));
      grid.append(card);
    }
  } finally {
    await closePdf(document);
  }
}

async function updateOrganize(context: PreviewContext, file: File): Promise<void> {
  const generation = context.generation;
  loading(context, 'Preparando el organizador de páginas…');

  if (context.doc) {
    await closePdf(context.doc);
    context.doc = null;
  }

  const document = await openPdf(file);
  context.doc = document;
  const total = document.numPages;
  if (total > 300) {
    previewError(
      context,
      `Este PDF tiene ${total} páginas. El organizador admite hasta 300; divídelo antes.`,
    );
    await closePdf(document);
    context.doc = null;
    return;
  }

  const order = Array.from({ length: total }, (_, index) => index + 1);
  const rotations = Array.from({ length: total }, () => 0);
  const thumbs = new Map<number, string>();
  const modeField = hiddenField(context.root, 'mode');
  const canReorder = !modeField || modeField.value !== 'rotate';

  const orderField = hiddenField(context.root, 'pageOrder');
  const rotationsField = hiddenField(context.root, 'pageRotations');

  const syncFields = (notify = true): void => {
    if (orderField) orderField.value = order.join(',');
    if (rotationsField) rotationsField.value = rotations.join(',');
    if (notify) notifyChanged(context.root);
  };

  let rendering = false;
  let version = 0;

  const render = async (): Promise<void> => {
    if (generation !== context.generation) return;
    if (rendering) return;
    rendering = true;
    version += 1;
    const current = version;

    try {
      const visible = order.slice(0, 24);
      for (const pageNumber of visible) {
        if (thumbs.has(pageNumber)) continue;
        const page = await document.getPage(pageNumber);
        try {
          const blob = await renderThumbnail(page);
          thumbs.set(pageNumber, objectUrl(context, blob));
        } finally {
          page.cleanup();
        }
        if (generation !== context.generation || current !== version) return;
      }

      if (generation !== context.generation) return;
      const note =
        total > 24
          ? `${total} páginas · mueve o gira y el resto conserva su orden`
          : `${total} página(s) · toca las flechas para mover o girar`;
      const { grid } = previewShell(
        context,
        canReorder ? 'Reordena y gira las páginas' : 'Gira las páginas',
        note,
      );

      visible.forEach((pageNumber, index) => {
        const card = element(
          'div',
          'overflow-hidden rounded-xl border border-slate-200 bg-white',
        );
        card.draggable = canReorder;
        card.dataset.page = String(pageNumber);

        const thumb = element(
          'div',
          'relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-slate-50',
        );
        const url = thumbs.get(pageNumber);
        if (url) {
          const image = element('img', 'h-full w-full object-contain p-1.5 transition-transform duration-200');
          image.src = url;
          image.alt = `Página ${pageNumber}`;
          image.loading = 'lazy';
          image.style.transform = `rotate(${rotations[pageNumber - 1] ?? 0}deg)`;
          thumb.append(image);
        }

        const badge = element(
          'span',
          'absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white',
          String(index + 1),
        );
        const original = element(
          'span',
          'absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-slate-500',
          `p. ${pageNumber}`,
        );
        thumb.append(badge, original);

        const controls = element('div', 'flex items-center justify-center gap-1 border-t border-slate-100 p-1.5');
        const rotateLeft = moveButton('Girar a la izquierda', '↺', false);
        const rotateRight = moveButton('Girar a la derecha', '↻', false);
        rotateLeft.addEventListener('click', () => {
          rotations[pageNumber - 1] = ((rotations[pageNumber - 1] ?? 0) - 90 + 360) % 360;
          syncFields();
          void render();
        });
        rotateRight.addEventListener('click', () => {
          rotations[pageNumber - 1] = ((rotations[pageNumber - 1] ?? 0) + 90) % 360;
          syncFields();
          void render();
        });
        controls.append(rotateLeft, rotateRight);

        if (canReorder) {
          const left = moveButton('Mover antes', '←', index === 0);
          const right = moveButton('Mover después', '→', index === visible.length - 1);
          left.addEventListener('click', () => {
            const from = order.indexOf(pageNumber);
            if (from <= 0) return;
            [order[from - 1], order[from]] = [order[from]!, order[from - 1]!];
            syncFields();
            void render();
          });
          right.addEventListener('click', () => {
            const from = order.indexOf(pageNumber);
            if (from < 0 || from >= order.length - 1) return;
            [order[from], order[from + 1]] = [order[from + 1]!, order[from]!];
            syncFields();
            void render();
          });
          controls.prepend(left);
          controls.append(right);

          card.addEventListener('dragstart', (event) => {
            event.dataTransfer?.setData('text/plain', String(pageNumber));
            event.dataTransfer?.setData('application/x-convertilocal-page', String(pageNumber));
          });
          card.addEventListener('dragover', (event) => {
            event.preventDefault();
          });
          card.addEventListener('drop', (event) => {
            event.preventDefault();
            const raw = event.dataTransfer?.getData('application/x-convertilocal-page');
            const dragged = Number(raw);
            if (!Number.isInteger(dragged)) return;
            const from = order.indexOf(dragged);
            const to = order.indexOf(pageNumber);
            if (from < 0 || to < 0 || from === to) return;
            const [moved] = order.splice(from, 1);
            order.splice(to, 0, moved!);
            syncFields();
            void render();
          });
        }

        card.append(thumb, controls);
        grid.append(card);
      });
    } finally {
      rendering = false;
    }
  };

  syncFields(false);
  await render();
}

export function createPdfPreview(root: HTMLElement, mode: string): PdfPreviewController {
  const container = root.querySelector<HTMLElement>('[data-fp-pdf-preview]');
  const normalized: PreviewMode = mode === 'merge' || mode === 'pages' ? mode : 'organize';
  const context: PreviewContext = {
    root,
    mode: normalized,
    container: container ?? document.createElement('div'),
    generation: 0,
    doc: null,
    urls: [],
  };

  return {
    async update(files: File[]): Promise<void> {
      context.generation += 1;
      const generation = context.generation;
      if (context.doc) {
        await closePdf(context.doc);
        context.doc = null;
      }
      revokeUrls(context);

      if (files.length === 0) {
        context.container.replaceChildren();
        context.container.hidden = true;
        const order = hiddenField(root, 'pageOrder');
        const rotations = hiddenField(root, 'pageRotations');
        if (order) order.value = '';
        if (rotations) rotations.value = '';
        return;
      }

      try {
        if (normalized === 'merge') await updateMerge(context, files);
        else if (normalized === 'pages') await updatePages(context, files[0]!);
        else await updateOrganize(context, files[0]!);
      } catch (error) {
        if (generation !== context.generation) return;
        previewError(
          context,
          error instanceof Error
            ? `No pudimos mostrar la vista previa: ${error.message}`
            : 'No pudimos mostrar la vista previa de este PDF.',
        );
      }
    },

    destroy(): void {
      context.generation += 1;
      revokeUrls(context);
      if (context.doc) void closePdf(context.doc);
      context.doc = null;
      context.container.replaceChildren();
      context.container.hidden = true;
    },
  };
}
