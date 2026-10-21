import { PdfProcessingError } from '@/types/pdf';

export interface PageRangeGroup {
  label: string;
  pages: number[];
}

function parseToken(token: string, total: number): number[] {
  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
  if (!match) {
    throw new PdfProcessingError(
      'INVALID_RANGE',
      `El rango "${token}" no es válido. Usa números o intervalos como 1-3,5.`,
    );
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;

  if (start < 1 || end < 1 || start > total || end > total) {
    throw new PdfProcessingError(
      'INVALID_RANGE',
      `El rango "${token}" queda fuera del documento, que tiene ${total} página(s).`,
    );
  }

  if (start > end) {
    throw new PdfProcessingError(
      'INVALID_RANGE',
      `El intervalo "${token}" empieza después de terminar.`,
    );
  }

  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
}

function compactLabel(pages: number[]): string {
  if (pages.length === 0) return 'seleccion';
  return pages.length <= 4 ? pages.join('-') : `${pages[0]}-${pages[pages.length - 1]}`;
}

/**
 * Interpreta una lista de rangos 1-based separados por comas.
 * Ejemplo: "1-3, 5, 8-10" -> tres grupos.
 * Si el valor está vacío, devuelve todas las páginas como un único grupo.
 */
export function parsePageRanges(value: string, total: number): PageRangeGroup[] {
  const clean = value.trim();
  if (!clean) return [{ label: 'todas', pages: Array.from({ length: total }, (_, index) => index + 1) }];

  const groups: PageRangeGroup[] = [];
  const tokens = clean.split(',').map((token) => token.trim());

  for (const token of tokens) {
    if (!token) {
      throw new PdfProcessingError('INVALID_RANGE', 'Hay una coma vacía en la lista de páginas.');
    }

    const parsed = parseToken(token, total);
    const unique: number[] = [];
    for (const page of parsed) {
      if (!unique.includes(page)) unique.push(page);
    }
    groups.push({ label: compactLabel(unique), pages: unique });
  }

  if (groups.length === 0) {
    throw new PdfProcessingError('INVALID_RANGE', 'Indica al menos una página.');
  }

  return groups;
}

/** Une todos los grupos y elimina duplicados conservando el orden. */
export function flattenPageRanges(groups: PageRangeGroup[]): number[] {
  const pages: number[] = [];
  for (const group of groups) {
    for (const page of group.pages) {
      if (!pages.includes(page)) pages.push(page);
    }
  }
  return pages;
}
