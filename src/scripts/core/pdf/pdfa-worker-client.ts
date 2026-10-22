/**
 * src/scripts/core/pdf/pdfa-worker-client.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { PdfProcessingError } from '@/types/pdf';
import type { ProcessorOptions } from '@/types/processor';

interface PendingJob {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  onProgress?: (percent: number) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<string, PendingJob>();

function failAll(message: string): void {
  for (const job of pending.values()) {
    job.reject(new PdfProcessingError('WORKER_FAILED', message));
  }
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('../../workers/pdf-to-pdfa.worker.ts', import.meta.url), {
    type: 'module',
    name: 'convertilocal-pdfa',
  });

  worker.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as {
      type: 'progress' | 'result' | 'error';
      id: string;
      percent?: number;
      blob?: Blob;
      message?: string;
    };

    const job = pending.get(message.id);
    if (!job) return;

    if (message.type === 'progress') {
      job.onProgress?.(message.percent ?? 0);
      return;
    }

    pending.delete(message.id);

    if (message.type === 'result' && message.blob) {
      job.resolve(message.blob);
    } else {
      job.reject(new PdfProcessingError('PROCESSING_FAILED', message.message ?? 'No se pudo convertir el PDF.'));
    }
  });

  worker.addEventListener('error', () => {
    failAll('El motor de PDF/A se detuvo. Recarga la página e inténtalo de nuevo.');
    worker?.terminate();
    worker = null;
  });

  return worker;
}

export function runPdfaJob(
  file: File,
  options: ProcessorOptions,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const instance = getWorker();
  const id = `pdfa-${Date.now()}-${sequence++}`;

  return new Promise<Blob>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pending.delete(id);
      reject(new PdfProcessingError('WORKER_FAILED', 'La conversión tardó demasiado. Prueba con un archivo más ligero.'));
    }, 300000);

    pending.set(id, {
      resolve: (blob) => {
        window.clearTimeout(timeout);
        resolve(blob);
      },
      reject: (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
      onProgress,
    });

    instance.postMessage({ id, file, options: { ...options, onWarning: undefined } });
  });
}

export function stopPdfaWorker(): void {
  if (!worker) return;
  worker.terminate();
  worker = null;
  failAll('Procesamiento cancelado.');
}
