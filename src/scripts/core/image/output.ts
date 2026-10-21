import type { ImageFormatId, OutputFormatId } from '@/types/image';
import { mimeForFormat } from './sniff';

const OUTPUT_EXTENSION: Record<OutputFormatId, string> = {
  png: 'png',
  jpg: 'jpg',
  webp: 'webp',
  avif: 'avif',
  bmp: 'bmp',
  ico: 'ico',
};

const OUTPUT_MIME: Record<OutputFormatId, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
};

export function extensionFor(format: ImageFormatId): string {
  return format === 'heic' ? 'heic' : OUTPUT_EXTENSION[format];
}

export function mimeForOutput(format: ImageFormatId): string {
  return format === 'heic' ? mimeForFormat('heic') : OUTPUT_MIME[format];
}

export function baseNameOf(name: string): string {
  const dot = name.lastIndexOf('.');
  const raw = dot > 0 ? name.slice(0, dot) : name;
  const clean = Array.from(raw, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f || '\\/:*?"<>|'.includes(char) ? '-' : char;
  })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return clean || 'imagen';
}

export function outputName(name: string, format: OutputFormatId): string {
  return `${baseNameOf(name)}.${OUTPUT_EXTENSION[format]}`;
}

export function suffixedOutputName(name: string, format: OutputFormatId, suffix: string): string {
  return `${baseNameOf(name)}${suffix}.${OUTPUT_EXTENSION[format]}`;
}

export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base}-${index}${extension}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
