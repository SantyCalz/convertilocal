/**
 * src/scripts/core/pdf/geometry.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type PdfPagePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PdfPageSize = 'a4' | 'letter' | 'auto';
export type PdfOrientation = 'auto' | 'portrait' | 'landscape';

export const A4 = { width: 595.28, height: 841.89 };
export const LETTER = { width: 612, height: 792 };

export function parseHexColor(value: string): { r: number; g: number; b: number } {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return { r: 0.2, g: 0.2, b: 0.2 };
  const hex = match[1]!;
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

export function normalizeAngle(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function textPosition(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  position: PdfPagePosition,
  margin: number,
): { x: number; y: number } {
  const left = margin;
  const right = Math.max(margin, pageWidth - margin - textWidth);
  const centerX = Math.max(0, (pageWidth - textWidth) / 2);
  const bottom = margin;
  const top = Math.max(margin, pageHeight - margin - textHeight);
  const centerY = Math.max(0, (pageHeight - textHeight) / 2);

  switch (position) {
    case 'top-left':
      return { x: left, y: top };
    case 'top-center':
      return { x: centerX, y: top };
    case 'top-right':
      return { x: right, y: top };
    case 'center':
      return { x: centerX, y: centerY };
    case 'bottom-left':
      return { x: left, y: bottom };
    case 'bottom-right':
      return { x: right, y: bottom };
    case 'bottom-center':
    default:
      return { x: centerX, y: bottom };
  }
}

/** Dimensiones de página en puntos. `auto` usa la imagen a 96 ppp. */
export function pageDimensions(
  size: PdfPageSize,
  orientation: PdfOrientation,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  let base: { width: number; height: number };

  if (size === 'auto') {
    base = {
      width: (imageWidth * 72) / 96,
      height: (imageHeight * 72) / 96,
    };
  } else {
    base = size === 'letter' ? { ...LETTER } : { ...A4 };
  }

  const useLandscape =
    orientation === 'landscape' ||
    (orientation === 'auto' && base.width < base.height && imageWidth > imageHeight) ||
    (orientation === 'auto' && size === 'auto' && imageWidth > imageHeight);

  const isLandscape = base.width > base.height;
  if ((useLandscape && !isLandscape) || (!useLandscape && isLandscape)) {
    base = { width: base.height, height: base.width };
  }

  return base;
}

/** Ajusta una imagen dentro de un área con márgenes, conservando proporción. */
export function fitImage(
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
  margin: number,
): { x: number; y: number; width: number; height: number } {
  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}
