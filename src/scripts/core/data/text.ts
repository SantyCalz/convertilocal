/**
 * src/scripts/core/data/text.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type TextStats = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  paragraphs: number;
};

export type TextCleanOptions = {
  removeExtraBreaks?: boolean;
  collapseSpaces?: boolean;
  trimLines?: boolean;
  removeEmptyLines?: boolean;
  caseTransform?: 'none' | 'lower' | 'upper' | 'title' | 'sentence';
};

export function cleanText(text: string, options: TextCleanOptions = {}): string {
  let result = text.replace(/\uFEFF/g, '');

  if (options.trimLines ?? true) {
    result = result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join('\n');
  }

  if (options.collapseSpaces ?? true) {
    result = result.replace(/[ \t]{2,}/g, ' ');
  }

  if (options.removeExtraBreaks ?? true) {
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  if (options.removeEmptyLines) {
    result = result
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  }

  switch (options.caseTransform ?? 'none') {
    case 'lower':
      result = result.toLowerCase();
      break;
    case 'upper':
      result = result.toUpperCase();
      break;
    case 'title':
      result = result.replace(/\p{L}[\p{L}'’-]*/gu, (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      );
      break;
    case 'sentence':
      result = result.replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, prefix, letter) =>
        `${prefix}${letter.toUpperCase()}`,
      );
      break;
    default:
      break;
  }

  return result.trim();
}

export function countText(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const lines = text === '' ? 0 : text.split(/\r?\n/).length;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;

  return {
    words,
    characters,
    charactersNoSpaces,
    lines,
    paragraphs,
  };
}

export function formatStats(stats: TextStats): string {
  return [
    `Palabras: ${stats.words}`,
    `Caracteres: ${stats.characters}`,
    `Caracteres sin espacios: ${stats.charactersNoSpaces}`,
    `Líneas: ${stats.lines}`,
    `Párrafos: ${stats.paragraphs}`,
  ].join(' · ');
}
