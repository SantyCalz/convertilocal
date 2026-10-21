import type { ProcessorOptions } from '@/types/processor';

interface WarningOptions extends ProcessorOptions {
  onWarning?: (message: string) => void;
}

export function fileFromDataOutput(blob: Blob, name: string, type: string): File {
  return new File([blob], name, { type, lastModified: Date.now() });
}

export function notifyDataWarning(options: ProcessorOptions, message: string): void {
  (options as WarningOptions).onWarning?.(message);
}

export function baseName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}._ -]+/gu, '')
      .trim()
      .slice(0, 80) || 'archivo'
  );
}
