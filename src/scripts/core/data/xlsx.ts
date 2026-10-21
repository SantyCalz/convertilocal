/**
 * src/scripts/core/data/xlsx.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type XlsxReadResult = {
  rows: string[][];
  sheetNames: string[];
  selectedSheet: string;
};

export async function readXlsx(
  file: File,
  sheetName?: string,
): Promise<XlsxReadResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo XLSX no contiene hojas.');
  }

  const selectedSheet =
    sheetName && workbook.SheetNames.includes(sheetName)
      ? sheetName
      : (workbook.SheetNames[0] as string);

  const sheet = workbook.Sheets[selectedSheet];
  if (!sheet) throw new Error('No se pudo leer la hoja seleccionada.');
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][];

  return {
    rows: rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))),
    sheetNames: workbook.SheetNames,
    selectedSheet,
  };
}

export async function writeXlsx(rows: string[][], sheetName = 'Hoja1'): Promise<Blob> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Hoja1');

  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function xlsxSheetNames(file: File): Promise<string[]> {
  return readXlsx(file).then((result) => result.sheetNames);
}
