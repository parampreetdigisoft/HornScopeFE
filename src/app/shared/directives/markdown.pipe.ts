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
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    };
    
    marked.use({ renderer, breaks: true });
  }

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    try {
      const rawHtml = marked.parse(value) as string;
      return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
  }
}