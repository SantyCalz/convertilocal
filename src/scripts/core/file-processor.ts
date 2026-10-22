/**
 * src/scripts/core/file-processor.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ImageFormatId } from '@/types/image';
import type { ProcessorOptions, ProcessorOutput } from '@/types/processor';
import { filesFromClipboard, nameClipboardFile } from './clipboard';
import { downloadOutputs } from './download';
import { getProcessor } from '@/scripts/processors/registry';
import {
  formatMatchesAccept,
  isImageAccept,
  labelForFormat,
  sniffImage,
} from './image/sniff';
import { isPdfAccept, sniffPdf } from './pdf/sniff';
import { isDataAccept, sniffData } from './data/sniff';
import { isMediaAccept, sniffMedia } from './media/sniff';
import { initFileReorder } from './file-reorder';

type StatusTone = 'idle' | 'ready' | 'working' | 'success' | 'error';

interface InstanceState {
  files: File[];
  outputs: ProcessorOutput[];
  busy: boolean;
  validating: boolean;
  done: boolean;
}

interface CheckedFile {
  file: File;
  format: ImageFormatId | null;
}

const DEFAULT_MAX_FILES = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionLabel(name: string): string {
  const extension = name.includes('.') ? name.split('.').pop() : '';
  return (extension || 'FILE').slice(0, 4).toUpperCase();
}

type WeightTone = 'savings' | 'growth' | 'neutral';

interface WeightBadge {
  text: string;
  tone: WeightTone;
}

const WEIGHT_BADGE_CLASSES: Record<WeightTone, string> = {
  savings:
    'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100',
  growth:
    'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100',
  neutral:
    'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200',
};

/**
 * Decide cómo mostrar la diferencia de peso.
 *
 * El porcentaje solo informa cuando el resultado es más ligero. Quitar el
 * fondo o convertir a PNG engordan el archivo por naturaleza, así que un
 * «+655 % de peso» confunde en lugar de ayudar: en esos casos se muestra un
 * distintivo neutro que explica el formato en lugar de la cifra.
 */
function weightBadge(
  beforeBytes: number,
  afterBytes: number,
  outputType: string,
  sourceType: string,
  isCutout: boolean,
): WeightBadge | null {
  if (beforeBytes <= 0) return null;

  const diff = beforeBytes - afterBytes;
  const percent = Math.round((Math.abs(diff) / beforeBytes) * 100);

  if (diff >= 0) {
    return { text: `−${percent}% de peso`, tone: 'savings' };
  }

  if (isCutout) {
    return { text: outputType === 'image/webp' ? 'WebP transparente' : 'PNG transparente', tone: 'neutral' };
  }

  if (outputType === 'image/png' && sourceType !== 'image/png') {
    return { text: 'PNG sin pérdida', tone: 'neutral' };
  }

  return { text: `+${percent}% de peso`, tone: 'growth' };
}

function isAcceptedByExtension(file: File, accept: string): boolean {
  if (!accept || accept === '*') return true;

  return accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule === '*/*') return true;
      if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
      if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
      return file.type.toLowerCase() === rule;
    });
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function optionValue(
  field: HTMLInputElement | HTMLSelectElement,
): string | number | boolean {
  if (field instanceof HTMLInputElement) {
    if (field.type === 'checkbox') return field.checked;
    if (field.type === 'range' || field.type === 'number') return Number(field.value);
    return field.value;
  }
  return field.value;
}

function readOptions(root: HTMLElement): ProcessorOptions {
  const options: ProcessorOptions = {};

  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-fp-option]').forEach((field) => {
    const id = field.dataset.fpOption;
    if (!id) return;
    options[id] = field.dataset.optionType === 'boolean' ? field.value === 'true' : optionValue(field);
  });

  return options;
}

function getControl(root: HTMLElement, id: string): HTMLInputElement | HTMLSelectElement | null {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-fp-option]');
  for (const field of fields) {
    if (field.dataset.fpOption === id) return field;
  }
  return null;
}

function setup(root: HTMLElement): void {
  if (root.dataset.fpReady === 'true') return;
  root.dataset.fpReady = 'true';

  const dropzone = root.querySelector<HTMLElement>('[data-fp-dropzone]');
  const input = root.querySelector<HTMLInputElement>('[data-fp-input]');
  const fileList = root.querySelector<HTMLUListElement>('[data-fp-file-list]');
  const filesPanel = root.querySelector<HTMLElement>('[data-fp-files]');
  const countLabel = root.querySelector<HTMLElement>('[data-fp-count]');
  const clearButton = root.querySelector<HTMLButtonElement>('[data-fp-clear]');
  const statusBox = root.querySelector<HTMLElement>('[data-fp-status-box]');
  const statusText = root.querySelector<HTMLElement>('[data-fp-status]');
  const progressWrap = root.querySelector<HTMLElement>('[data-fp-progress-wrap]');
  const progressTrack = root.querySelector<HTMLElement>('[data-fp-progress]');
  const progressBar = root.querySelector<HTMLElement>('[data-fp-progress-bar]');
  const progressLabel = root.querySelector<HTMLElement>('[data-fp-progress-label]');
  const action = root.querySelector<HTMLButtonElement>('[data-fp-action]');
  const actionBar = root.querySelector<HTMLElement>('[data-fp-actionbar]');
  const reset = root.querySelector<HTMLButtonElement>('[data-fp-reset]');
  const resultsPanel = root.querySelector<HTMLElement>('[data-fp-results]');
  const previewPanel = root.querySelector<HTMLElement>('[data-fp-preview]');
  const savingsBadge = root.querySelector<HTMLElement>('[data-fp-savings]');
  const extraNote = root.querySelector<HTMLElement>('[data-fp-extra]');

  if (!dropzone || !input || !fileList || !filesPanel || !action) return;

  const processorId = root.dataset.processorId ?? '';
  const accept = root.dataset.accept ?? '';
  const acceptLabel = root.dataset.acceptLabel ?? 'el formato indicado';
  const multiple = root.dataset.multiple === 'true';
  const maxSizeMB = Number(root.dataset.maxSize ?? '200');
  const maxBytes = maxSizeMB > 0 ? maxSizeMB * 1024 * 1024 : Number.POSITIVE_INFINITY;
  const maxFiles = Math.max(1, Number(root.dataset.maxFiles ?? DEFAULT_MAX_FILES));
  const maxTotalMB = Number(root.dataset.maxTotal ?? '120');
  const maxTotalBytes = maxTotalMB > 0 ? maxTotalMB * 1024 * 1024 : Number.POSITIVE_INFINITY;
  const actionLabel = root.dataset.actionLabel ?? 'Procesar archivo';
  const baseName = root.dataset.baseName ?? 'convertilocal';
  const previewMode = root.dataset.previewMode ?? 'none';
  const validatesImages = isImageAccept(accept);
  console.log('VALIDATES for', accept, 'images=', validatesImages, 'pdfs=', isPdfAccept(accept), 'data=', isDataAccept(accept), 'media=', isMediaAccept(accept));
  const validatesPdfs = isPdfAccept(accept);
  const validatesData = isDataAccept(accept);
  const validatesMedia = isMediaAccept(accept);
  // El reordenamiento por arrastre solo tiene sentido cuando hay varios
  // archivos y la vista previa no trae ya su propio reordenador.
  const canReorder = multiple && previewMode === 'none';

  const state: InstanceState = {
    files: [],
    outputs: [],
    busy: false,
    validating: false,
    done: false,
  };

  let previewUrls: string[] = [];
  let mediaPreviewUrl: string | null = null;
  let pdfPreview:
    | { update(files: File[]): Promise<void>; destroy(): void }
    | null = null;
  let pdfPreviewModule: Promise<typeof import('./pdf/preview')> | null = null;

  const updatePdfPreview = (): void => {
    if (previewMode === 'none') return;

    if (pdfPreview) {
      void pdfPreview.update(state.files);
      return;
    }

    pdfPreviewModule ??= import('./pdf/preview');
    void pdfPreviewModule
      .then(({ createPdfPreview }) => {
        pdfPreview ??= createPdfPreview(root, previewMode.replace('pdf-', ''));
        void pdfPreview.update(state.files);
      })
      .catch(() => {
        // La vista previa es una ayuda visual: si falla, el procesado sigue disponible.
      });
  };

  const updateMediaPreview = (): void => {
    const container = root.querySelector<HTMLElement>('[data-fp-media-preview]');
    if (!container) return;

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
      mediaPreviewUrl = null;
    }

    if (previewMode !== 'media' || state.files.length === 0) {
      container.replaceChildren();
      container.hidden = true;
      return;
    }

    const file = state.files[0];
    if (!file) {
      container.replaceChildren();
      container.hidden = true;
      return;
    }

    const url = URL.createObjectURL(file);
    mediaPreviewUrl = url;
    container.hidden = false;
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3';

    if (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.webm') || file.name.toLowerCase().endsWith('.mov')) {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.className = 'w-full rounded-xl bg-black';
      video.preload = 'metadata';
      wrapper.append(video);
    } else {
      const audio = document.createElement('audio');
      audio.src = url;
      audio.controls = true;
      audio.className = 'w-full';
      audio.preload = 'metadata';
      wrapper.append(audio);
    }

    container.append(wrapper);
  };

  const setStatus = (message: string, tone: StatusTone = 'idle'): void => {
    if (statusBox) statusBox.dataset.state = tone;
    if (statusText) statusText.textContent = message;
  };

  const setProgress = (percent: number | null): void => {
    if (!progressWrap || !progressTrack || !progressBar || !progressLabel) return;

    if (percent === null) {
      progressWrap.hidden = true;
      progressBar.style.width = '0%';
      progressTrack.setAttribute('aria-valuenow', '0');
      progressLabel.textContent = '0%';
      return;
    }

    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    progressWrap.hidden = false;
    progressBar.style.width = `${clamped}%`;
    progressTrack.setAttribute('aria-valuenow', String(clamped));
    progressLabel.textContent = `${clamped}%`;
  };

  const syncVisibility = (): void => {
    root.querySelectorAll<HTMLElement>('[data-fp-field]').forEach((field) => {
      const dependencyId = field.dataset.fpWhenId;
      if (!dependencyId) return;
      const control = getControl(root, dependencyId);
      if (!control) return;
      const expected = field.dataset.fpWhenValue ?? 'true';
      field.hidden = String(optionValue(control)) !== expected;
    });
  };

  const syncAction = (): void => {
    action.disabled = state.busy || state.validating || state.files.length === 0;
    if (actionBar) actionBar.hidden = state.files.length === 0;

    if (state.validating) {
      action.textContent = 'Comprobando…';
    } else if (state.busy) {
      action.textContent = 'Procesando…';
    } else if (state.done && state.outputs.length > 1) {
      action.textContent = `Descargar ZIP (${state.outputs.length})`;
    } else if (state.done && state.outputs.length === 1) {
      action.textContent = 'Descargar resultado';
    } else if (state.files.length > 1) {
      action.textContent = `Procesar ${state.files.length} archivos`;
    } else {
      action.textContent = actionLabel;
    }

    if (reset) reset.hidden = state.files.length === 0 || state.busy || state.validating;
    if (clearButton) clearButton.hidden = state.files.length === 0 || state.busy || state.validating;
    root.dataset.state = state.busy || state.validating ? 'working' : state.done ? 'done' : 'idle';

    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-fp-option]').forEach((field) => {
      field.disabled = state.busy || state.validating;
    });
  };

  const clearResults = (): void => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
    if (previewPanel) {
      previewPanel.replaceChildren();
      previewPanel.hidden = true;
    }
    if (resultsPanel) resultsPanel.hidden = true;
    if (savingsBadge) {
      savingsBadge.hidden = true;
      savingsBadge.textContent = '';
    }
    if (extraNote) {
      extraNote.hidden = true;
      extraNote.textContent = '';
    }
  };

  const isPdfBlob = (blob: Blob): boolean =>
    blob.type === 'application/pdf' || (blob instanceof File && /\.pdf$/i.test(blob.name));

  const makeThumb = (
    file: Blob | undefined,
    label: string,
    renderPdf = true,
  ): HTMLElement => {
    const figure = document.createElement('figure');
    figure.className = 'relative aspect-square bg-white';

    if (file) {
      const fileName = file instanceof File ? file.name : 'archivo';

      if (isPdfBlob(file)) {
        const placeholder = document.createElement('span');
        placeholder.className =
          'absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-400';
        placeholder.textContent = 'PDF';
        figure.append(placeholder);

        if (renderPdf) {
          void import('./pdf/pdfjs')
            .then(({ renderFirstPageThumbnail }) => renderFirstPageThumbnail(file, 220))
            .then((thumbnail) => {
              if (!figure.isConnected) return;
              const url = URL.createObjectURL(thumbnail);
              previewUrls.push(url);
              const image = document.createElement('img');
              image.src = url;
              image.alt = `${label}: ${fileName}`;
              image.loading = 'lazy';
              image.decoding = 'async';
              image.className = 'h-full w-full object-contain p-2';
              placeholder.replaceWith(image);
            })
            .catch(() => {
              // El resultado sigue disponible aunque no se pueda dibujar la miniatura.
            });
        }
      } else {
        const url = URL.createObjectURL(file);
        previewUrls.push(url);
        const image = document.createElement('img');
        image.src = url;
        image.alt = `${label}: ${fileName}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.className = 'h-full w-full object-contain p-2';
        image.addEventListener('error', () => {
          image.remove();
          const fallback = document.createElement('span');
          fallback.className =
            'absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-400';
          fallback.textContent = `${extensionLabel(fileName)} · sin vista previa`;
          figure.append(fallback);
        });
        figure.append(image);
      }
    }

    const badge = document.createElement('figcaption');
    badge.className =
      'absolute left-1.5 top-1.5 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white';
    badge.textContent = label;
    figure.append(badge);
    return figure;
  };

  const renderResults = (): void => {
    if (!resultsPanel || !previewPanel) return;

    clearResults();
    if (!state.done || state.outputs.length === 0) return;

    const totalBefore = state.files.reduce((sum, file) => sum + file.size, 0);
    const totalAfter = state.outputs.reduce((sum, output) => sum + output.size, 0);

    if (savingsBadge && totalBefore > 0) {
      const firstOutput = state.outputs[0];
      const firstSource = state.files[0];
      const badge = weightBadge(
        totalBefore,
        totalAfter,
        firstOutput?.type ?? '',
        firstSource?.type ?? '',
        processorId === 'remove-background',
      );

      if (badge) {
        savingsBadge.hidden = false;
        savingsBadge.textContent = badge.text;
        savingsBadge.className = WEIGHT_BADGE_CLASSES[badge.tone];
      }
    }

    // En modo «image-compare» el deslizador ya muestra el antes y el después.
    const visible = previewMode === 'image-compare' ? [] : state.outputs.slice(0, 6);
    visible.forEach((output, index) => {
      const source = state.files[index];
      const card = document.createElement('div');
      card.className = 'overflow-hidden rounded-xl border border-slate-200 bg-white';

      const thumbs = document.createElement('div');
      thumbs.className = 'grid grid-cols-2 gap-px bg-slate-200';
      thumbs.append(makeThumb(source, 'Antes', false), makeThumb(output, 'Después'));

      const body = document.createElement('div');
      body.className = 'p-2.5';

      const name = document.createElement('p');
      name.className = 'truncate text-xs font-semibold text-slate-800';
      name.textContent = output instanceof File ? output.name : `Archivo ${index + 1}`;
      name.title = name.textContent;

      const meta = document.createElement('p');
      meta.className = 'mt-1 text-[11px] text-slate-400';
      const before = source ? formatBytes(source.size) : '—';
      meta.textContent = `${before} → ${formatBytes(output.size)}`;

      if (source && source.size > 0) {
        const badge = weightBadge(
          source.size,
          output.size,
          output.type ?? '',
          source.type ?? '',
          processorId === 'remove-background',
        );

        if (badge) {
          const span = document.createElement('span');
          span.className =
            badge.tone === 'savings'
              ? 'ml-1.5 font-semibold text-emerald-600'
              : badge.tone === 'growth'
                ? 'ml-1.5 font-semibold text-amber-600'
                : 'ml-1.5 font-semibold text-slate-500';
          span.textContent = badge.text;
          meta.append(span);
        }
      }

      body.append(name, meta);
      card.append(thumbs, body);
      previewPanel.append(card);
    });

    if (extraNote && state.outputs.length > 6) {
      extraNote.hidden = false;
      extraNote.textContent = `+${state.outputs.length - 6} archivos más incluidos en la descarga.`;
    } else if (extraNote && state.outputs.length > 1) {
      extraNote.hidden = false;
      extraNote.textContent = 'Los archivos se descargan juntos en un ZIP generado en tu dispositivo.';
    }

    if (previewPanel) previewPanel.hidden = visible.length === 0;

    resultsPanel.hidden = false;
  };  const renderFiles = (): void => {
    if (!filesPanel || !fileList) return;

    filesPanel.hidden = state.files.length === 0;
    fileList.replaceChildren();

    if (countLabel) {
      const total = state.files.reduce((sum, file) => sum + file.size, 0);
      countLabel.textContent = `${state.files.length} ${
        state.files.length === 1 ? 'archivo' : 'archivos'
      } · ${formatBytes(total)}`;
    }

    state.files.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'flex items-center gap-3 py-2.5';
      item.dataset.fpFileItem = String(index);

      if (canReorder) {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.dataset.fpReorderHandle = '';
        handle.dataset.fpReorderIndex = String(index);
        handle.className =
          'touch-target flex shrink-0 cursor-grab items-center justify-center rounded-lg px-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing';
        handle.setAttribute('aria-label', `Reordenar ${file.name}. Usa las flechas arriba y abajo.`);
        handle.setAttribute('title', 'Arrastra para reordenar');
        handle.textContent = '⠿';
        item.append(handle);
      }

      const badge = document.createElement('span');
      badge.className =
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500';
      badge.textContent = extensionLabel(file.name);
      badge.setAttribute('aria-hidden', 'true');

      const meta = document.createElement('div');
      meta.className = 'min-w-0 flex-1';

      const name = document.createElement('p');
      name.className = 'truncate text-sm font-medium text-slate-800';
      name.textContent = file.name;
      name.title = file.name;

      const size = document.createElement('p');
      size.className = 'mt-0.5 text-xs text-slate-400';
      size.textContent = formatBytes(file.size);

      meta.append(name, size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.fpRemove = String(index);
      remove.className =
        'touch-target inline-flex shrink-0 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600';
      remove.textContent = 'Quitar';
      remove.setAttribute('aria-label', `Quitar ${file.name}`);

      item.append(badge, meta, remove);
      fileList.append(item);
    });

    try {
      updatePdfPreview();
    } catch {
      // La vista previa no debe bloquear el procesado.
    }
    try {
      updateMediaPreview();
    } catch {
      // La vista previa no debe bloquear el procesado.
    }
  };

  const resetState = (message = 'Añade un archivo para empezar. Todo se procesa en tu dispositivo.'): void => {
    state.files = [];
    state.outputs = [];
    state.done = false;
    input.value = '';
    clearResults();
    renderFiles();
    setProgress(null);
    setStatus(message, 'idle');
    syncAction();
  };

  const checkFiles = async (candidates: File[]): Promise<{
    accepted: CheckedFile[];
    invalid: File[];
    wrongFormat: CheckedFile[];
  }> => {
    if (!validatesImages) {
      const accepted: CheckedFile[] = [];
      const invalid: File[] = [];
      const wrongFormat: CheckedFile[] = [];

      for (const file of candidates) {
        if (!isAcceptedByExtension(file, accept)) {
          wrongFormat.push({ file, format: null });
          continue;
        }

        if (validatesPdfs && !(await sniffPdf(file))) {
          invalid.push(file);
          continue;
        }

        if (validatesData && !(await sniffData(file))) {
          invalid.push(file);
          continue;
        }

        if (validatesMedia && !(await sniffMedia(file))) {
          invalid.push(file);
          continue;
        }

        accepted.push({ file, format: null });
      }

      return { accepted, invalid, wrongFormat };
    }

    const accepted: CheckedFile[] = [];
    const invalid: File[] = [];
    const wrongFormat: CheckedFile[] = [];

    for (const file of candidates) {
      const sniffed = await sniffImage(file);
      if (!sniffed) {
        invalid.push(file);
      } else if (!formatMatchesAccept(sniffed.format, accept)) {
        wrongFormat.push({ file, format: sniffed.format });
      } else {
        accepted.push({ file, format: sniffed.format });
      }
    }

    return { accepted, invalid, wrongFormat };
  };

  const addFiles = async (incoming: FileList | File[]): Promise<void> => {
    const candidates = Array.from(incoming);
    if (candidates.length === 0) return;

    if (state.validating) return;

    state.validating = true;
    syncAction();
    setStatus('Comprobando el contenido real de los archivos…', 'working');

    try {
      const { accepted, invalid, wrongFormat } = await checkFiles(candidates);

      if (accepted.length === 0) {
        if (invalid.length > 0) {
          setStatus(
            'No pudimos leer el contenido de esos archivos. Pueden estar dañados o no ser el formato que indican.',
            'error',
          );
        } else if (wrongFormat.length > 0) {
          const sample = wrongFormat[0]!;
          const actual = sample.format ? labelForFormat(sample.format) : extensionLabel(sample.file.name);
          setStatus(
            `Formato no compatible: «${sample.file.name}» es ${actual}. Esta herramienta acepta ${acceptLabel}.`,
            'error',
          );
        } else {
          setStatus(`Formato no compatible. Esta herramienta acepta ${acceptLabel}.`, 'error');
        }
        return;
      }

      const withinSize = accepted.filter(({ file }) => file.size <= maxBytes);
      const oversized = accepted.filter(({ file }) => file.size > maxBytes);

      if (withinSize.length === 0) {
        setStatus(
          `El archivo supera el límite de ${maxSizeMB} MB. Prueba con una copia más ligera.`,
          'error',
        );
        return;
      }

      let nextFiles: File[];
      let truncated = false;
      const existingKeys = new Set(
        state.files.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
      );
      const newFiles = withinSize
        .map(({ file }) => file)
        .filter((file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`));

      if (newFiles.length === 0) {
        setStatus(
          withinSize.length === 1
            ? 'Ese archivo ya está en la lista.'
            : 'Esos archivos ya están en la lista.',
          'ready',
        );
        return;
      }

      nextFiles = multiple ? [...state.files, ...newFiles] : [newFiles[0]!];
      nextFiles = nextFiles.filter(
        (file, index, list) =>
          list.findIndex(
            (other) =>
              other.name === file.name &&
              other.size === file.size &&
              other.lastModified === file.lastModified,
          ) === index,
      );

      if (nextFiles.length > maxFiles) {
        nextFiles = nextFiles.slice(0, maxFiles);
        truncated = true;
      }

      let totalTruncated = false;
      let runningTotal = 0;
      const withinTotal: File[] = [];
      for (const file of nextFiles) {
        if (runningTotal + file.size <= maxTotalBytes) {
          withinTotal.push(file);
          runningTotal += file.size;
        } else {
          totalTruncated = true;
        }
      }

      if (withinTotal.length === 0) {
        setStatus(
          `El lote supera el límite de ${maxTotalMB} MB. Prueba con menos archivos o más ligeros.`,
          'error',
        );
        return;
      }

      state.files = withinTotal;
      state.outputs = [];
      state.done = false;
      clearResults();
      renderFiles();
      setProgress(null);
      syncAction();
      input.value = '';

      const totalSize = state.files.reduce((sum, file) => sum + file.size, 0);
      const labels = [`${state.files.length} archivo(s) listo(s) · ${formatBytes(totalSize)}`];

      if (wrongFormat.length > 0) labels.push(`${wrongFormat.length} con formato distinto`);
      if (invalid.length > 0) labels.push(`${invalid.length} ilegible(s)`);
      if (oversized.length > 0) labels.push(`${oversized.length} por encima de ${maxSizeMB} MB`);
      if (truncated) labels.push(`máximo ${maxFiles} archivos`);
      if (totalTruncated) labels.push(`límite de ${maxTotalMB} MB`);

      setStatus(`${labels.join(' · ')}. Pulsa «${actionLabel}».`, 'ready');
    } finally {
      state.validating = false;
      syncAction();
    }
  };

  const removeFile = (index: number): void => {
    state.files.splice(index, 1);
    state.outputs = [];
    state.done = false;
    clearResults();
    renderFiles();
    setProgress(null);
    syncAction();

    if (state.files.length === 0) {
      setStatus('Añade un archivo para empezar. Todo se procesa en tu dispositivo.', 'idle');
    } else {
      setStatus(`${state.files.length} archivo(s) en la lista.`, 'ready');
    }
  };

  input.addEventListener('change', () => {
    if (input.files) void addFiles(input.files);
  });

  let dragDepth = 0;

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    dropzone.dataset.drag = 'true';
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  dropzone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) delete dropzone.dataset.drag;
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    delete dropzone.dataset.drag;
    if (event.dataTransfer?.files) void addFiles(event.dataTransfer.files);
  });

  document.addEventListener('paste', (event) => {
    if (!isVisible(root)) return;

    const pasted = filesFromClipboard(event);
    if (pasted.length === 0) return;

    event.preventDefault();
    void addFiles(pasted.map((file, index) => nameClipboardFile(file, index)));
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const removeButton = target.closest<HTMLButtonElement>('[data-fp-remove]');
    if (removeButton) {
      const index = Number(removeButton.dataset.fpRemove);
      if (Number.isInteger(index)) removeFile(index);
      return;
    }

    if (target.closest('[data-fp-clear]')) {
      resetState();
      return;
    }

    if (target.closest('[data-fp-reset]')) {
      resetState('Listo para otro archivo.');
    }
  });

  root.addEventListener('convertilocal:reorder-files', (event) => {
    const detail = (event as CustomEvent<{ from?: number; to?: number }>).detail;
    const from = detail?.from;
    const to = detail?.to;
    if (
      typeof from !== 'number' ||
      typeof to !== 'number' ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to < 0 ||
      from >= state.files.length ||
      to >= state.files.length ||
      from === to
    ) {
      return;
    }

    const [moved] = state.files.splice(from, 1);
    if (!moved) return;
    state.files.splice(to, 0, moved);
    state.outputs = [];
    state.done = false;
    clearResults();
    setProgress(null);
    renderFiles();
    syncAction();
    setStatus('Orden actualizado. Pulsa procesar para aplicar los cambios.', 'ready');
  });

  /**
   * Permite añadir archivos desde fuera del selector (por ejemplo, el HTML
   * que se pega en el cuadro de texto de la herramienta HTML a PDF).
   */
  root.addEventListener('convertilocal:add-files', (event) => {
    const detail = (event as CustomEvent<{ files?: File[] }>).detail;
    const incoming = detail?.files;
    if (!incoming || incoming.length === 0) return;
    void addFiles(incoming);
  });

  root.addEventListener('convertilocal:options-changed', () => {
    state.outputs = [];
    state.done = false;    clearResults();
    setProgress(null);
    setStatus('Vista previa actualizada. Vuelve a procesar para aplicar los cambios.', 'ready');
    syncAction();
  });

  root.querySelectorAll<HTMLInputElement>('input[type="range"][data-fp-option]').forEach((range) => {
    const output = range.parentElement?.querySelector<HTMLOutputElement>('[data-fp-range-output]');
    if (!output) return;
    const unit = output.dataset.fpRangeUnit ?? '';
    const update = (): void => {
      output.textContent = `${range.value}${unit}`;
    };
    range.addEventListener('input', update);
    update();
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (!target.matches('[data-fp-option]')) return;

    syncVisibility();

    if (!state.busy && state.done) {
      state.outputs = [];
      state.done = false;
      clearResults();
      setProgress(null);
      setStatus('Opciones actualizadas. Vuelve a procesar para aplicar los cambios.', 'ready');
      syncAction();
    }
  });

  syncVisibility();
  initFileReorder(root);

  action.addEventListener('click', async () => {
    if (state.busy || state.validating || state.files.length === 0) return;

    if (state.done && state.outputs.length > 0) {
      setStatus('Preparando la descarga…', 'working');
      const outcome = await downloadOutputs(state.outputs, {
        fallbackName: baseName,
        title: `${baseName} · ConvertiLocal`,
        zipName: `${baseName}-${state.outputs.length}-archivos.zip`,
      });

      if (outcome === 'downloaded') {
        setStatus('Descarga iniciada. Revisa tu carpeta de descargas.', 'success');
      } else if (outcome === 'shared') {
        setStatus('Archivo compartido o guardado desde el menú del sistema.', 'success');
      } else {
        setStatus('Descarga cancelada. Puedes intentarlo de nuevo.', 'idle');
      }
      return;
    }

    const processor = await getProcessor(processorId);
    if (!processor) {
      setStatus('Esta herramienta todavía no está disponible.', 'error');
      return;
    }

    state.busy = true;
    state.done = false;
    state.outputs = [];
    clearResults();
    syncAction();
    setProgress(0);
    setStatus('Procesando en tu dispositivo. No cierres esta pestaña.', 'working');

    const warnings: string[] = [];

    try {
      const options = readOptions(root);
      options.onWarning = (message: string): void => {
        if (!warnings.includes(message)) warnings.push(message);
      };

      const outputs = await processor.run(state.files, options, (percent) => {
        setProgress(percent);
      });

      if (outputs.length === 0) throw new Error('El procesador no devolvió ningún archivo.');

      state.outputs = outputs;
      state.done = true;
      setProgress(100);
      renderResults();

      const doneMessage = `Listo: ${
        outputs.length === 1 ? 'tu archivo está preparado' : `${outputs.length} archivos preparados`
      } para descargar.`;
      setStatus(warnings.length > 0 ? `${doneMessage} ${warnings[0]}` : doneMessage, 'success');

      const resultUrls = outputs.map((output) => {
        const url = URL.createObjectURL(output);
        previewUrls.push(url);
        return url;
      });

      // La vista «antes y después» necesita la imagen original del primer
      // archivo y el resultado ya procesado.
      const source = state.files[0];
      const beforeUrl = source ? URL.createObjectURL(source) : undefined;
      if (beforeUrl) previewUrls.push(beforeUrl);

      root.dispatchEvent(
        new CustomEvent('convertilocal:processed', {
          bubbles: true,
          detail: { processorId, files: outputs.length, resultUrls, beforeUrl, afterUrl: resultUrls[0] },
        }),
      );
    } catch (error) {
      console.error(error);
      clearResults();
      setStatus(
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo. Inténtalo de nuevo.',
        'error',
      );
      setProgress(null);
    } finally {
      state.busy = false;
      syncAction();
    }
  });

  resetState();
}

export function initFileProcessors(): void {
  document.querySelectorAll<HTMLElement>('[data-file-processor]').forEach(setup);
}
