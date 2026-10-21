export type CsvRow = string[];

export function parseCsv(text: string, delimiter = ','): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let atFieldStart = true;

  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (atFieldStart) {
        inQuotes = true;
        atFieldStart = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = '';
      atFieldStart = true;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      atFieldStart = true;
      continue;
    }

    if (char === '\r') {
      if (next === '\n') continue;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      atFieldStart = true;
      continue;
    }

    field += char;
    atFieldStart = false;
  }

  if (field !== '' || row.length > 0 || atFieldStart === false) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.length > 0 || item[0] !== '');
}

export function stringifyCsv(
  rows: CsvRow[],
  delimiter = ',',
  lineEnding = '\n',
): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          const value = field ?? '';
          if (/[",\n\r]/.test(value) || value.includes(delimiter)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(delimiter),
    )
    .join(lineEnding);
}

export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = sample.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return bestCount > 0 ? best : ',';
}
