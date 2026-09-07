import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Renderer } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  constructor() {
    // Custom renderer for better styling inside chat bubbles
    const renderer = new Renderer();

    renderer.table = (header, body) => {
      return `<div class="md-table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
    };

    renderer.blockquote = (quote) => {
      return `<blockquote class="md-quote">${quote}</blockquote>`;
    };

    renderer.code = (code, lang) => {
      return `<pre class="md-code"><code>${code}</code></pre>`;
    };

    renderer.link = (href: string, title: string | null | undefined, text: string) => {
      // Validate href
      if (!href || (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('/') && !href.startsWith('#'))) {
        return text || href || '';
      }

      // Clean text from internal HTML breaks or newlines
      const cleanText = (text || href)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const titleAttr = title ? ` title="${title}"` : ` title="${href}"`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="chat-markdown-link"><span>${cleanText}</span><svg class="chat-link-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
    };

    marked.use({ renderer, breaks: true, gfm: true });
  }

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    try {
      let processed = value;

      // 1. Merge adjacent double brackets like [Title][Junk / nav tags](url) -> [Title](url)
      processed = processed.replace(
        /\[([^\]\n]{1,160})\]\s*\[([^\]]{1,300})\]\((https?:\/\/[^\s)]+)\)/g,
        (match, title, junk, url) => {
          const cleanTitle = title.replace(/\s+/g, ' ').trim();
          return `[${cleanTitle}](${url})`;
        }
      );

      // 2. Normalize multiline link text in markdown links: [text\nwith\nbreaks](url) -> [text with breaks](url)
      processed = processed.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (match, label, url) => {
          const cleanLabel = label.replace(/\s+/g, ' ').trim();
          return `[${cleanLabel}](${url})`;
        }
      );

      // 3. Clean any orphaned bracket nav text before markdown parsing: e.g. [+4°C\nPolicies & action...][source_N]
      processed = processed.replace(
        /\[(\+?\d+°C[^\n\]]*\n[^\]]+)\]/g,
        (match, content) => {
          return `[${content.replace(/\s+/g, ' ').trim()}]`;
        }
      );

      const rawHtml = marked.parse(processed) as string;
      return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
  }
}