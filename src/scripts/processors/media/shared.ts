import type { ProcessorOptions } from '@/types/processor';

interface WarningOptions extends ProcessorOptions {
  onWarning?: (message: string) => void;
}

export function fileFromMediaOutput(
  output: { data: Uint8Array; name: string; extension: string },
  type: string,
): File {
  const buffer = new Uint8Array(output.data.byteLength);
  buffer.set(output.data);
  const blob = new Blob([buffer.buffer], { type });
  return new File([blob], output.name, { type, lastModified: Date.now() });
}

export function notifyMediaWarning(options: ProcessorOptions, message: string): void {
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

export function mimeTypeForExtension(extension: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    webm: 'video/webm',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    gif: 'image/gif',
  };
  return map[extension] ?? 'application/octet-stream';
}
