import type { Processor } from '@/types/processor';
import { DataProcessingError } from '@/types/data';
import { baseName, fileFromDataOutput, notifyDataWarning } from './shared';
import { markdownToHtml, htmlToMarkdown } from '@/scripts/core/data/markdown';

function extensionOf(file: File): string {
  const parts = file.name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() ?? '' : '';
}

function detectMode(file: File, option: string): 'markdown-to-html' | 'html-to-markdown' {
  if (option === 'markdown-to-html' || option === 'html-to-markdown') return option;

  const extension = extensionOf(file);
  if (extension === 'md' || extension === 'markdown') return 'markdown-to-html';
  if (extension === 'html' || extension === 'htm') return 'html-to-markdown';
  return 'markdown-to-html';
}

export const markdownHtmlProcessor: Processor = {
  id: 'markdown-html',
  name: 'Markdown y HTML',
  accepts: [
    '.md',
    '.markdown',
    '.html',
    '.htm',
    'text/markdown',
    'text/html',
  ],
  async run(files, options, onProgress) {
    const modeOption = String(options.mode ?? 'auto');
    const sanitize = options.sanitize !== false;
    const gfm = options.gfm !== false;
    const outputs = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const text = await file.text();
      const mode = detectMode(file, modeOption);

      if (mode === 'markdown-to-html') {
        const html = await markdownToHtml(text, { gfm, sanitize });
        outputs.push(
          fileFromDataOutput(
            new Blob([html], { type: 'text/html' }),
            `${baseName(file.name)}.html`,
            'text/html',
          ),
        );
      } else {
        const markdown = await htmlToMarkdown(text);
        outputs.push(
          fileFromDataOutput(
            new Blob([markdown], { type: 'text/markdown' }),
            `${baseName(file.name)}.md`,
            'text/markdown',
          ),
        );
      }

      onProgress?.(Math.round(((index + 1) / files.length) * 100));
    }

    if (outputs.length === 0) {
      throw new DataProcessingError('INVALID_DATA', 'Añade al menos un archivo válido.');
    }

    notifyDataWarning(options, 'La conversión preserva la estructura básica; estilos CSS complejos no se trasladan.');
    return outputs;
  },
};
