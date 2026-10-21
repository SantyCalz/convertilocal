import type { PdfJobOperation, PdfRasterPage } from '@/types/pdf';
import type { ProcessorOptions, ProcessorOutput } from '@/types/processor';
import { runPdfJob } from '@/scripts/core/pdf/pdf-worker-client';

interface WarningOptions extends ProcessorOptions {
  onWarning?: (message: string) => void;
}

export function fileFromPdfOutput(blob: Blob, name: string, type: string): File {
  return new File([blob], name, { type, lastModified: Date.now() });
}

export async function runPdfProcessor(
  op: PdfJobOperation,
  files: File[],
  options: ProcessorOptions,
  onProgress?: (percent: number) => void,
  pages?: PdfRasterPage[],
): Promise<ProcessorOutput[]> {
  const result = await runPdfJob(op, files, options, onProgress, pages);
  const warningOptions = options as WarningOptions;
  for (const warning of result.warnings) warningOptions.onWarning?.(warning);

  return result.outputs.map((output) =>
    fileFromPdfOutput(output.blob, output.name, output.type),
  );
}

export function notifyWarning(options: ProcessorOptions, message: string): void {
  (options as WarningOptions).onWarning?.(message);
}
