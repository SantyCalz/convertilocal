import type { Processor } from '@/types/processor';
import { DataProcessingError } from '@/types/data';
import { baseName, fileFromDataOutput, notifyDataWarning } from './shared';
import { cleanText, countText, formatStats } from '@/scripts/core/data/text';

function extensionOf(file: File): string {
  const parts = file.name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() ?? 'txt' : 'txt';
}

export const textCleanerProcessor: Processor = {
  id: 'text-cleaner',
  name: 'Limpiar texto',
  accepts: ['.txt', '.md', '.html', '.htm', 'text/plain', 'text/markdown', 'text/html'],
  async run(files, options, onProgress) {
    const outputs = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const text = await file.text();
      const cleaned = cleanText(text, {
        removeExtraBreaks: options.removeExtraBreaks !== false,
        collapseSpaces: options.collapseSpaces !== false,
        trimLines: options.trimLines !== false,
        removeEmptyLines: options.removeEmptyLines === true,
        caseTransform:
          options.caseTransform === 'lower' ||
          options.caseTransform === 'upper' ||
          options.caseTransform === 'title' ||
          options.caseTransform === 'sentence'
            ? options.caseTransform
            : 'none',
      });

      const stats = countText(cleaned);
      let outputText = cleaned;

      if (options.includeStats === true) {
        outputText = `${cleaned}\n\n---\n${formatStats(stats)}\n`;
      }

      const extension = extensionOf(file);
      outputs.push(
        fileFromDataOutput(
          new Blob([outputText], { type: file.type || 'text/plain' }),
          `${baseName(file.name)}-limpio.${extension}`,
          file.type || 'text/plain',
        ),
      );

      notifyDataWarning(options, formatStats(stats));
      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) {
      throw new DataProcessingError('INVALID_DATA', 'Añade al menos un archivo de texto válido.');
    }

    return outputs;
  },
};
