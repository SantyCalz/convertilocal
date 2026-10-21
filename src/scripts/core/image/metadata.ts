import type { ImageFormatId } from '@/types/image';

export interface MetadataStripResult {
  bytes: Uint8Array;
  removed: boolean;
  orientation: number;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let output = '';
  for (let index = start; index < start + length && index < bytes.length; index += 1) {
    output += String.fromCharCode(bytes[index] ?? 0);
  }
  return output;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

/** Lee la orientación EXIF sin depender de una librería externa. */
export function readTiffOrientation(bytes: Uint8Array, start: number): number {
  let offset = start;
  if (ascii(bytes, offset, 6) === 'Exif\0\0') offset += 6;
  if (offset + 8 > bytes.length) return 1;

  const little = bytes[offset] === 0x49 && bytes[offset + 1] === 0x49;
  const big = bytes[offset] === 0x4d && bytes[offset + 1] === 0x4d;
  if (!little && !big) return 1;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read16 = (position: number): number =>
    little ? view.getUint16(position, true) : view.getUint16(position, false);
  const read32 = (position: number): number =>
    little ? view.getUint32(position, true) : view.getUint32(position, false);

  if (read16(offset + 2) !== 42) return 1;
  const ifd = offset + read32(offset + 4);
  if (ifd + 2 > bytes.length) return 1;
  const count = read16(ifd);
  if (count > 4096) return 1;

  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > bytes.length) break;
    const tag = read16(entry);
    if (tag === 0x0112) {
      const type = read16(entry + 2);
      const values = read32(entry + 4);
      if (type === 3 && values >= 1) {
        const value = read16(entry + 8);
        return value >= 1 && value <= 8 ? value : 1;
      }
    }
  }

  return 1;
}

function stripJpeg(bytes: Uint8Array): MetadataStripResult {
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  let orientation = 1;
  let removed = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      parts.push(bytes.subarray(offset));
      offset = bytes.length;
      break;
    }

    const marker = bytes[offset + 1] ?? 0;

    if (marker === 0xff) {
      offset += 1;
      continue;
    }

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (marker === 0xda) {
      parts.push(bytes.subarray(offset));
      offset = bytes.length;
      break;
    }

    if (offset + 4 > bytes.length) break;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2 || offset + 2 + length > bytes.length) return { bytes, removed: false, orientation: 1 };

    const payload = offset + 4;
    const end = offset + 2 + length;
    const isExif = marker === 0xe1 && ascii(bytes, payload, 6) === 'Exif\0\0';
    const isXmp =
      marker === 0xe1 && ascii(bytes, payload, 28) === 'http://ns.adobe.com/xap/1.0';
    const remove = isExif || isXmp || marker === 0xed || marker === 0xfe;

    if (isExif) orientation = readTiffOrientation(bytes, payload + 6);
    if (remove) removed = true;
    else parts.push(bytes.subarray(offset, end));
    offset = end;
  }

  return { bytes: concat(parts), removed, orientation };
}

function stripPng(bytes: Uint8Array): MetadataStripResult {
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let orientation = 1;
  let removed = false;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const end = offset + 12 + length;
    if (length > bytes.length || end > bytes.length) return { bytes, removed: false, orientation: 1 };
    const type = ascii(bytes, offset + 4, 4);

    if (type === 'eXIf') orientation = readTiffOrientation(bytes, offset + 8);
    const remove = ['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].includes(type);
    if (remove) removed = true;
    else parts.push(bytes.subarray(offset, end));

    offset = end;
    if (type === 'IEND') break;
  }

  return { bytes: concat(parts), removed, orientation };
}

function stripWebp(bytes: Uint8Array): MetadataStripResult {
  const parts: Uint8Array[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let orientation = 1;
  let removed = false;

  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size;
    const paddedEnd = end + (size % 2);
    if (end > bytes.length) return { bytes, removed: false, orientation: 1 };

    if (type === 'EXIF') orientation = readTiffOrientation(bytes, offset + 8);

    if (type === 'EXIF' || type === 'XMP ') {
      removed = true;
    } else if (type === 'VP8X' && size >= 1) {
      const chunk = bytes.slice(offset, Math.min(paddedEnd, bytes.length));
      chunk[8] = (chunk[8] ?? 0) & ~0x0c;
      parts.push(chunk);
    } else {
      parts.push(bytes.subarray(offset, Math.min(paddedEnd, bytes.length)));
    }

    offset = paddedEnd;
  }

  const body = concat(parts);
  const output = new Uint8Array(12 + body.length);
  output.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  const outView = new DataView(output.buffer);
  outView.setUint32(4, 4 + body.length, true);
  output.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  output.set(body, 12);

  return { bytes: output, removed, orientation };
}

/**
 * Elimina metadatos EXIF/XMP/IPTC sin recomprimir.
 * Conserva los perfiles de color ICC y los datos de imagen.
 */
export function stripImageMetadata(buffer: ArrayBuffer, format: ImageFormatId): MetadataStripResult {
  const bytes = new Uint8Array(buffer);

  try {
    if (format === 'jpg') return stripJpeg(bytes);
    if (format === 'png') return stripPng(bytes);
    if (format === 'webp') return stripWebp(bytes);
  } catch (error) {
    console.warn('No se pudieron analizar los metadatos; se conserva el archivo original.', error);
  }

  return { bytes, removed: false, orientation: 1 };
}

export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type });
}
