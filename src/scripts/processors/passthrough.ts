/**
 * src/scripts/processors/passthrough.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Processor, ProcessorOutput } from '@/types/processor';

function renameWithSuffix(name: string, suffix: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}${suffix}`;
  return `${name.slice(0, dot)}${suffix}${name.slice(dot)}`;
}

/**
 * Procesador de laboratorio de la Fase 0.
 *
 * No convierte nada: copia los bytes y renombra el archivo. Sirve para validar
 * arrastre, pegado, progreso, descarga y fallback de iOS sin añadir librerías.
 * Se sustituirá por procesadores reales en la Fase 1.
 */
export const passthroughProcessor: Processor = {
  id: 'passthrough',
  name: 'Duplicador de laboratorio',
  accepts: ['*'],
  options: [
    {
      id: 'suffix',
      label: 'Sufijo del archivo',
      type: 'text',
      defaultValue: '-copia',
      placeholder: '-copia',
      help: 'Se añade antes de la extensión. Solo en esta demo.',
    },
  ],
  async run(files, options, onProgress): Promise<ProcessorOutput[]> {
    const rawSuffix = typeof options.suffix === 'string' ? options.suffix.trim() : '';
    const suffix = (rawSuffix || '-copia').replace(/[\\/:*?"<>|]/g, '-').slice(0, 32);
    const outputs: ProcessorOutput[] = [];

    for (const [fileIndex, file] of files.entries()) {
      const chunks: BlobPart[] = [];
      const reader = file.stream().getReader();
      let read = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as BlobPart);
          read += value.byteLength;
        }
        const fileFraction = file.size > 0 ? Math.min(read / file.size, 1) : 1;
        const percent = Math.round(((fileIndex + fileFraction) / files.length) * 100);
        onProgress?.(Math.min(percent, 99));
      }

      outputs.push(
        new File(chunks, renameWithSuffix(file.name, suffix), {
          type: file.type || 'application/octet-stream',
          lastModified: Date.now(),
        }),
      );
    }

    onProgress?.(100);
    return outputs;
  },
};
