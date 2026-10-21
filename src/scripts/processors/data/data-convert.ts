import type { Processor } from '@/types/processor';
import { DataProcessingError } from '@/types/data';
import { baseName, fileFromDataOutput, notifyDataWarning } from './shared';


type DataFormat = 'json' | 'csv' | 'xlsx' | 'yaml' | 'xml';

function extensionOf(file: File): string {
  const parts = file.name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() ?? '' : '';
}

function detectFormat(file: File, option: string): DataFormat {
  if (option && option !== 'auto') return option as DataFormat;

  const extension = extensionOf(file);
  if (extension === 'json') return 'json';
  if (extension === 'csv') return 'csv';
  if (extension === 'xlsx' || extension === 'xls') return 'xlsx';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  if (extension === 'xml') return 'xml';

  if (file.type.includes('json')) return 'json';
  if (file.type.includes('csv')) return 'csv';
  if (file.type.includes('sheet') || file.type.includes('excel')) return 'xlsx';
  if (file.type.includes('yaml') || file.type.includes('yml')) return 'yaml';
  if (file.type.includes('xml')) return 'xml';

  throw new DataProcessingError('UNSUPPORTED_FORMAT', 'No pudimos detectar el formato de entrada.');
}

function toRows(value: unknown): string[][] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [[]];
    if (Array.isArray(value[0])) {
      return (value as unknown[][]).map((row) => row.map((cell) => String(cell ?? '')));
    }
    if (typeof value[0] === 'object' && value[0] !== null) {
      const keys = Array.from(
        new Set(value.flatMap((item) => Object.keys(item as Record<string, unknown>))),
      );
      return [
        keys,
        ...value.map((item) =>
          keys.map((key) => {
            const cell = (item as Record<string, unknown>)[key];
            return cell === null || cell === undefined
              ? ''
              : typeof cell === 'object'
                ? JSON.stringify(cell)
                : String(cell);
          }),
        ),
      ];
    }
    return value.map((item) => [String(item ?? '')]);
  }

  if (value && typeof value === 'object') {
    return [
      ['clave', 'valor'],
      ...Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        val === null || val === undefined
          ? ''
          : typeof val === 'object'
            ? JSON.stringify(val)
            : String(val),
      ]),
    ];
  }

  return [[String(value ?? '')]];
}

function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length === 0) return [];
  const firstRow = rows[0] ?? [];
  const header = firstRow.map((cell, index) => cell.trim() || `columna_${index + 1}`);
  return rows.slice(1).map((row) => {
    const item: Record<string, string> = {};
    header.forEach((key, index) => {
      item[key] = row[index] ?? '';
    });
    return item;
  });
}

async function parseInput(file: File, format: DataFormat, options: Record<string, unknown>) {
  if (format === 'json') {
    return JSON.parse(await file.text());
  }

  if (format === 'yaml') {
    const { parseYaml } = await import('@/scripts/core/data/yaml');
    return parseYaml(await file.text());
  }

  if (format === 'xml') {
    const { parseXml } = await import('@/scripts/core/data/xml');
    return parseXml(await file.text());
  }

  if (format === 'csv') {
    const { parseCsv, detectDelimiter } = await import('@/scripts/core/data/csv');
    const delimiter =
      typeof options.delimiter === 'string' && options.delimiter !== 'auto'
        ? options.delimiter
        : detectDelimiter(await file.text());
    const rows = parseCsv(await file.text(), delimiter);
    return options.header === false ? rows : rowsToObjects(rows);
  }

  if (format === 'xlsx') {
    const { readXlsx } = await import('@/scripts/core/data/xlsx');
    const sheet = typeof options.sheet === 'string' ? options.sheet : undefined;
    const result = await readXlsx(file, sheet);
    if (result.sheetNames.length > 1) {
      notifyDataWarning(
        options as any,
        `Se leyó la hoja "${result.selectedSheet}". El archivo tiene ${result.sheetNames.length} hojas; las demás se omitieron en esta versión.`,
      );
    }
    if (result.rows.length > 100000) {
      throw new DataProcessingError('TOO_MANY_ROWS', 'El archivo supera las 100.000 filas admitidas.');
    }
    return options.header === false ? result.rows : rowsToObjects(result.rows);
  }

  throw new DataProcessingError('UNSUPPORTED_FORMAT', 'Formato de entrada no admitido.');
}

function delimiterFromOption(value: unknown): string {
  if (value === 'semicolon') return ';';
  if (value === 'tab') return '\t';
  if (value === 'pipe') return '|';
  return ',';
}

async function convertValue(
  value: unknown,
  target: DataFormat,
  options: Record<string, unknown>,
): Promise<{ blob: Blob; type: string; extension: string }> {
  if (target === 'json') {
    const text = JSON.stringify(value, null, options.pretty === false ? 0 : 2);
    return {
      blob: new Blob([text], { type: 'application/json' }),
      type: 'application/json',
      extension: 'json',
    };
  }

  if (target === 'yaml') {
    const { stringifyYaml } = await import('@/scripts/core/data/yaml');
    const text = stringifyYaml(value, options.pretty !== false);
    return {
      blob: new Blob([text], { type: 'application/x-yaml' }),
      type: 'application/x-yaml',
      extension: 'yaml',
    };
  }

  if (target === 'xml') {
    const { stringifyXml } = await import('@/scripts/core/data/xml');
    const rootName = typeof options.rootKey === 'string' && options.rootKey.trim() ? options.rootKey.trim() : 'root';
    const text = stringifyXml(value, rootName);
    return {
      blob: new Blob([text], { type: 'application/xml' }),
      type: 'application/xml',
      extension: 'xml',
    };
  }

  if (target === 'csv') {
    const { stringifyCsv } = await import('@/scripts/core/data/csv');
    const delimiter = delimiterFromOption(options.delimiter);
    const rows = toRows(value);
    const text = stringifyCsv(rows, delimiter);
    return {
      blob: new Blob([text], { type: 'text/csv' }),
      type: 'text/csv',
      extension: 'csv',
    };
  }

  if (target === 'xlsx') {
    const { writeXlsx } = await import('@/scripts/core/data/xlsx');
    const rows = toRows(value);
    const blob = await writeXlsx(rows);
    return {
      blob,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  throw new DataProcessingError('UNSUPPORTED_FORMAT', 'Formato de salida no admitido.');
}

export const dataConvertProcessor: Processor = {
  id: 'data-convert',
  name: 'Convertir datos',
  accepts: [
    '.json',
    '.csv',
    '.xlsx',
    '.xls',
    '.yaml',
    '.yml',
    '.xml',
    'application/json',
    'text/csv',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  async run(files, options, onProgress) {
    const outputs = [];
    const inputFormatOption = String(options.from ?? 'auto');
    const target = String(options.to ?? 'json') as DataFormat;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const sourceFormat = detectFormat(file, inputFormatOption);
      const value = await parseInput(file, sourceFormat, options);
      const converted = await convertValue(value, target, options);
      const name = `${baseName(file.name)}.${converted.extension}`;

      outputs.push(fileFromDataOutput(converted.blob, name, converted.type));
      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) {
      throw new DataProcessingError('INVALID_DATA', 'Añade al menos un archivo válido.');
    }

    return outputs;
  },
};
