/**
 * src/scripts/core/pdf/sniff.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/** true si `accept` contiene un PDF, aunque venga junto a otros formatos. */
export function isPdfAccept(accept: string): boolean {
  return accept
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .some((value) => value === '.pdf' || value === 'application/pdf');
}

/**
 * Comprueba la cabecera real del PDF. La especificación permite basura antes
 * de la cabecera, así que buscamos `%PDF-` en los primeros 1024 bytes.
 */
export async function sniffPdf(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const limit = bytes.length - PDF_SIGNATURE.length;

  for (let offset = 0; offset <= limit; offset += 1) {
    let matches = true;
    for (let index = 0; index < PDF_SIGNATURE.length; index += 1) {
      if (bytes[offset + index] !== PDF_SIGNATURE[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}
