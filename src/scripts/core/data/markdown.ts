import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

export async function markdownToHtml(
  markdown: string,
  options: { gfm?: boolean; sanitize?: boolean } = {},
): Promise<string> {
  const { gfm = true, sanitize = true } = options;
  marked.setOptions({ gfm, breaks: false });

  const html = await marked.parse(markdown);
  return sanitize ? DOMPurify.sanitize(html) : html;
}

export async function htmlToMarkdown(html: string): Promise<string> {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  return service.turndown(html);
}
