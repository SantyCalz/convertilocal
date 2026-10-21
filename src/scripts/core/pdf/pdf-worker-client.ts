import type {
  PdfErrorCode,
  PdfJobOperation,
  PdfOutput,
  PdfRasterPage,
  PdfWorkerMessage,
} from '@/types/pdf';
import { PdfProcessingError } from '@/types/pdf';
import type { ProcessorOptions } from '@/types/processor';

interface PendingJob {
  resolve: (result: { outputs: PdfOutput[]; warnings: string[] }) => void;
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

  worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url), {
    type: 'module',
    name: 'convertilocal-pdf',
  });

  worker.addEventListener('message', (event: MessageEvent<PdfWorkerMessage>) => {
    const message = event.data;
    const job = pending.get(message.id);
    if (!job) return;

    if (message.type === 'progress') {
      job.onProgress?.(message.percent);
      return;
    }

    pending.delete(message.id);

    if (message.type === 'result') {
      job.resolve({ outputs: message.outputs, warnings: message.warnings ?? [] });
    } else {
      job.reject(new PdfProcessingError(message.code, message.message));
    }
  });

  worker.addEventListener('error', () => {
    failAll('El motor de PDF se detuvo. Recarga la página e inténtalo de nuevo.');
    worker?.terminate();
    worker = null;
  });

  return worker;
}

export function runPdfJob(
  op: PdfJobOperation,
  files: File[],
  options: ProcessorOptions,
  onProgress?: (percent: number) => void,
  pages?: PdfRasterPage[],
): Promise<{ outputs: PdfOutput[]; warnings: string[] }> {
  const instance = getWorker();
  const id = `pdf-${Date.now()}-${sequence++}`;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pending.delete(id);
      reject(new PdfProcessingError('WORKER_FAILED', 'El procesamiento de PDF tardó demasiado. Prueba con un archivo más ligero.'));
    }, 300000);

    pending.set(id, {
      resolve: (result) => {
        window.clearTimeout(timeout);
        if (!result.outputs || result.outputs.length === 0 || result.outputs.some((item) => !(item.blob instanceof Blob) || item.blob.size === 0)) {
          reject(new PdfProcessingError('PROCESSING_FAILED', 'El procesador no generó un PDF válido.'));
        } else {
          resolve(result);
        }
      },
      reject: (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
      onProgress,
    });

    const cloneableOptions = { ...options };
    delete cloneableOptions.onWarning;
    instance.postMessage({ id, op, files, options: cloneableOptions, pages });
  });
}

export function stopPdfWorker(): void {
  if (!worker) return;
  worker.terminate();
  worker = null;
  failAll('Procesamiento cancelado.');
}

export function pdfErrorCode(error: unknown): PdfErrorCode | null {
  return error instanceof PdfProcessingError ? error.code : null;
}
