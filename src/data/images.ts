/**
 * src/data/images.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import formatsData from './formats.json';
import conversionsData from './conversions.json';
import type { ConversionEntry, ImageFormatId, ImageFormatInfo } from '@/types/image';

export const FORMATS = formatsData as unknown as ImageFormatInfo[];
export const CONVERSIONS = conversionsData as unknown as ConversionEntry[];

const formatMap = new Map(FORMATS.map((format) => [format.id, format]));
const conversionMap = new Map(CONVERSIONS.map((conversion) => [conversion.slug, conversion]));

export function getFormat(id: ImageFormatId): ImageFormatInfo {
  const format = formatMap.get(id);
  if (!format) throw new Error(`Formato desconocido: ${id}`);
  return format;
}

export function getConversion(slug: string): ConversionEntry | undefined {
  return conversionMap.get(slug);
}

export function conversionsFrom(id: ImageFormatId): ConversionEntry[] {
  return CONVERSIONS.filter((conversion) => conversion.from === id);
}

export function conversionsTo(id: ImageFormatId): ConversionEntry[] {
  return CONVERSIONS.filter((conversion) => conversion.to === id);
}

export function conversionPath(slug: string): string {
  return `/convertir/${slug}`;
}

/** Extensiones y MIME que acepta el selector de archivos para un formato. */
export function acceptForFormat(id: ImageFormatId): string[] {
  const format = getFormat(id);
  const extension = format.extension;
  const extra = id === 'jpg' ? ['.jpeg'] : [];
  return [...extra, extension, format.mime];
}
