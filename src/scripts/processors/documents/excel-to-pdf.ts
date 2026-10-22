/**
 * src/scripts/processors/documents/excel-to-pdf.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOutput } from '@/types/processor';
import type { WorkBook } from 'xlsx';
import { DocumentProcessingError } from '@/types/documents';

/** Máximo de filas por hoja para no bloquear el navegador. */
const ROW_LIMIT = 5000;

interface WarningOptions {
  onWarning?: (message: string) => void;
}

export const excelToPdfProcessor: Processor = {
  id: 'excel-to-pdf',
  name: 'Excel a PDF',
  accepts: [
    '.xlsx',
    '.xls',
    '.csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ],
  async run(files, options, onProgress) {
    const file = files[0];
    if (!file) {
      throw new DocumentProcessingError('INVALID_DOCUMENT', 'Añade un archivo de Excel (.xlsx).');
    }

    onProgress?.(5);

    const XLSX = await import('xlsx');
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    let workbook: WorkBook;
    try {
      const arrayBuffer = await file.arrayBuffer();
      workbook = XLSX.read(arrayBuffer, { type: 'array', cellNF: true, cellText: true });
    } catch (error) {
      console.error(error);
      throw new DocumentProcessingError(
        'INVALID_DOCUMENT',
        'No pudimos leer el libro. Comprueba que sea un .xlsx o .xls válido.',
      );
    }

    const sheetNames = workbook.SheetNames ?? [];
    if (sheetNames.length === 0) {
      throw new DocumentProcessingError('NO_PAGES', 'El libro no contiene hojas.');
    }

    const warningOptions = options as WarningOptions;
    const orientation =
      options.orientation === 'portrait' || options.orientation === 'landscape'
        ? options.orientation
        : 'auto';

    // Una sección por hoja. La orientación se decide por hoja según el número
    // de columnas: más de 5 columnas se pone en apaisado automáticamente.
    const sections = sheetNames.map((name: string) => {
      const sheet = workbook.Sheets[name]!;
      const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');

      const rows: string[][] = [];
      let truncated = false;

      for (let row = range.s.r; row <= range.e.r; row += 1) {
        if (rows.length >= ROW_LIMIT) {
          truncated = true;
          break;
        }
        const cells: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
          cells.push(cell ? String(cell.w ?? cell.v ?? '') : '');
        }
        rows.push(cells);
      }

      return { name, rows, truncated, columns: range.e.c - range.s.c + 1 };
    });

    for (const section of sections) {
      if (section.truncated) {
        warningOptions.onWarning?.(
          `La hoja «${section.name}» tiene más de ${ROW_LIMIT} filas: se han recortado al tope.`,
        );
      }
    }

    warningOptions.onWarning?.(
      'Extracción de datos en tablas. Gráficos, imágenes y formato condicional no se conservan en esta versión.',
    );

    onProgress?.(20);

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    sections.forEach((section: { name: string; rows: string[][]; truncated: boolean; columns: number }, index: number) => {
      if (index > 0) pdf.addPage();

      const landscape =
        orientation === 'landscape' || (orientation === 'auto' && section.columns > 5);
      if (landscape) {
        pdf.setPage(index + 1);
        pdf.internal.pageSize.width = pageHeight;
        pdf.internal.pageSize.height = pageWidth;
      }

      pdf.setFontSize(14);
      pdf.text(section.name, 14, 20);

      const [head, ...body] = section.rows;
      const headRow = head ?? [];
      const bodyRows = body.length > 0 ? body : section.rows.length > 0 ? [] : [];

      // Si solo hay una fila, la tratamos como cuerpo sin cabecera.
      const useHeader = section.rows.length > 1;

      autoTable(pdf, {
        head: useHeader ? [headRow] : undefined,
        body: useHeader ? bodyRows : section.rows,
        startY: 28,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 249] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });

      onProgress?.(20 + ((index + 1) / sections.length) * 75);
    });

    onProgress?.(100);

    const blob = pdf.output('blob');
    return [
      new File([blob], 'hojas-a-pdf.pdf', { type: 'application/pdf', lastModified: Date.now() }),
    ] satisfies ProcessorOutput[];
  },
};
