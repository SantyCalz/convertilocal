/**
 * src/scripts/core/worker-client.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type {
  ImageErrorCode,
  ImageJobOperation,
  ImageJobOptions,
  ImageJobResult,
  ImageJobRequest,
  ImageWorkerMessage,
} from '@/types/image';
import { ImageProcessingError } from '@/types/image';

interface PendingJob {
  resolve: (result: ImageJobResult) => void;
  reject: (error: Error) => void;
  onProgress?: (percent: number) => void;
}

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<string, PendingJob>();

function failAll(message: string): void {
  for (const job of pending.values()) {
    job.reject(new ImageProcessingError('DECODE_FAILED', message));
  }
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url), {
    type: 'module',
    name: 'convertilocal-image',
  });

  worker.addEventListener('message', (event: MessageEvent<ImageWorkerMessage>) => {
    const message = event.data;
    const job = pending.get(message.id);
    if (!job) return;

    if (message.type === 'progress') {
      job.onProgress?.(message.percent);
      return;
    }

    pending.delete(message.id);

    if (message.type === 'result') {
      job.resolve({ blob: message.blob, meta: message.meta });
    } else {
      job.reject(new ImageProcessingError(message.code as ImageErrorCode, message.message));
    }
  });

  worker.addEventListener('error', () => {
    failAll('El procesador de imágenes se detuvo. Recarga la página e inténtalo de nuevo.');
    worker?.terminate();
    worker = null;
  });

  return worker;
}

export function runImageJob(
  file: File,
  op: ImageJobOperation,
  options: ImageJobOptions,
  onProgress?: (percent: number) => void,
): Promise<ImageJobResult> {
  const instance = getWorker();
  const id = `job-${Date.now()}-${sequence++}`;

  return new Promise<ImageJobResult>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    const request: ImageJobRequest = { id, op, file, options };
    instance.postMessage(request);
  });
}

export function stopImageWorker(): void {
  if (!worker) return;
  worker.terminate();
  worker = null;
  failAll('Procesamiento cancelado.');
}
