/**
 * src/scripts/core/image/sniff.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ImageFormatId } from '@/types/image';

export interface SniffResult {
  format: ImageFormatId;
  mime: string;
}

const FORMAT_MIME: Record<ImageFormatId, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  heic: 'image/heic',
};

const FORMAT_ACCEPT_TOKENS: Record<ImageFormatId, string[]> = {
  png: ['.png', 'image/png'],
  jpg: ['.jpg', '.jpeg', 'image/jpeg', 'image/jpg'],
  webp: ['.webp', 'image/webp'],
  avif: ['.avif', 'image/avif'],
  bmp: ['.bmp', 'image/bmp', 'image/x-ms-bmp'],
  ico: ['.ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/ico'],
  heic: ['.heic', '.heif', 'image/heic', 'image/heif', 'image/heic-sequence'],
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let output = '';
  for (let index = start; index < start + length && index < bytes.length; index += 1) {
    output += String.fromCharCode(bytes[index] ?? 0);
  }
  return output;
}

function isIsoBmff(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp';
}

function isoBrands(bytes: Uint8Array): string[] {
  if (!isIsoBmff(bytes)) return [];
  const boxSize = Math.min(
    ((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0),
    bytes.length,
  );
  const brands: string[] = [];
  for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
    brands.push(ascii(bytes, offset, 4).trim());
  }
  return brands.filter((brand) => /^[\x20-\x7e]{4}$/.test(brand));
}

/** Detecta el formato real a partir de los primeros bytes del archivo. */
export function detectImageFormat(bytes: Uint8Array): ImageFormatId | null {
  if (bytes.length < 12) return null;

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';

  if (ascii(bytes, 0, 2) === 'BM') return 'bmp';

  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) {
    const count = (bytes[4] ?? 0) | ((bytes[5] ?? 0) << 8);
    if (count > 0) return 'ico';
  }

  if (isIsoBmff(bytes)) {
    const brands = isoBrands(bytes);
    if (brands.some((brand) => brand === 'avif' || brand === 'avis')) return 'avif';
    if (
      brands.some((brand) =>
        ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(
          brand,
        ),
      )
    ) {
      return 'heic';
    }
  }

  return null;
}

export async function sniffImage(file: Blob): Promise<SniffResult | null> {
  if (file.size === 0) return null;
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const format = detectImageFormat(head);
  return format ? { format, mime: FORMAT_MIME[format] } : null;
}

export function mimeForFormat(format: ImageFormatId): string {
  return FORMAT_MIME[format];
}

function compareToken(format: ImageFormatId, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === '*/*' || normalized === 'image/*') return true;

  return FORMAT_ACCEPT_TOKENS[format].some((candidate) => {
    if (normalized.endsWith('/*')) {
      return candidate.startsWith(normalized.slice(0, -1));
    }
    return candidate === normalized;
  });
}

/** Comprueba si el formato real coincide con el atributo `accept` de la página. */
export function formatMatchesAccept(format: ImageFormatId, accept: string): boolean {
  if (!accept || accept.trim() === '*' || accept.trim() === '*/*') return true;
  return accept
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .some((token) => compareToken(format, token));
}

export function formatMatchesList(format: ImageFormatId, accepts: string[]): boolean {
  return accepts.some((token) => compareToken(format, token));
}

export function isImageAccept(accept: string): boolean {
  return /(^|,)\s*(image\/|\.(png|jpe?g|webp|avif|bmp|ico|heic|heif)\b)/i.test(accept);
}

export function labelForFormat(format: ImageFormatId): string {
  return {
    png: 'PNG',
    jpg: 'JPG',
    webp: 'WebP',
    avif: 'AVIF',
    bmp: 'BMP',
    ico: 'ICO',
    heic: 'HEIC',
  }[format];
}
