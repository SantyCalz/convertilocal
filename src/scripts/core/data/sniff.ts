/**
 * src/scripts/core/data/sniff.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export function isDataAccept(accept: string): boolean {
  const rules = accept.toLowerCase().split(',').map((rule) => rule.trim());
  return rules.some((rule) =>
    ['.json', '.csv', '.xlsx', '.xls', '.yaml', '.yml', '.xml', '.md', '.markdown', '.html', '.htm', '.txt', 'application/json', 'text/csv', 'application/xml', 'text/xml', 'text/markdown', 'text/html', 'text/plain', 'application/x-yaml', 'text/yaml'].includes(rule),
  );
}

export async function sniffData(file: File): Promise<boolean> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.json') || file.type === 'application/json') {
    try {
      JSON.parse(await file.text());
      return true;
    } catch {
      return false;
    }
  }

  if (name.endsWith('.xml') || file.type.includes('xml')) {
    try {
      const document = new DOMParser().parseFromString(await file.text(), 'application/xml');
      return !document.querySelector('parsererror');
    } catch {
      return false;
    }
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  return true;
}
