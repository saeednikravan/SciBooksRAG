import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return this.render(value);
  }

  private escape(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private render(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          result.push(`<pre><code class="language-${this.escape(codeLang)}">${this.escape(codeBuffer.join('\n'))}</code></pre>`);
          codeBuffer = [];
          codeLang = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (line.trim() === '') {
        result.push('');
        continue;
      }

      const trimmed = line.trim();

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        result.push(`<h${level}>${this.inline(headingMatch[2])}</h${level}>`);
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        result.push('<hr>');
        continue;
      }

      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        result.push(`<li>${this.inline(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        result.push(`<li>${this.inline(olMatch[1])}</li>`);
        continue;
      }

      const bqMatch = trimmed.match(/^>\s?(.*)$/);
      if (bqMatch) {
        result.push(`<blockquote>${this.inline(bqMatch[1])}</blockquote>`);
        continue;
      }

      result.push(`<p>${this.inline(trimmed)}</p>`);
    }

    if (inCodeBlock) {
      result.push(`<pre><code>${this.escape(codeBuffer.join('\n'))}</code></pre>`);
    }

    return this.wrapLists(result.join('\n'));
  }

  private inline(str: string): string {
    let s = this.escape(str);

    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/_(.+?)_/g, '<em>$1</em>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/  $/gm, '<br>');

    return s;
  }

  private wrapLists(html: string): string {
    return html.replace(/((?:<li>.*?<\/li>\n?)+)/g, (match) => `<ul>${match}</ul>`);
  }
}
