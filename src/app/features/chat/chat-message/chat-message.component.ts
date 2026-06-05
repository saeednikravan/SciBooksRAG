import { Component, input } from '@angular/core';
import { ChatMessage } from '../../../core/models/chat.model';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [MarkdownPipe],
  templateUrl: './chat-message.component.html',
   styles: [`
    .message { display: flex; gap: 14px; margin-bottom: 24px; }
    .user-message { flex-direction: row-reverse; }

    .avatar {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
    }

    .assistant-message .avatar {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: #ffffff;
    }

    .user-message .avatar {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .bubble {
      padding: 16px 20px;
      border-radius: 20px;
      max-width: 85%;
      line-height: 1.65;
      position: relative;
    }

    .assistant-message .bubble {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-top-left-radius: 4px;
    }

    .user-message .bubble {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: #ffffff;
      border-top-right-radius: 4px;
    }

    .content {
      font-size: 15px;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }

    .content ::ng-deep h1,
    .content ::ng-deep h2,
    .content ::ng-deep h3,
    .content ::ng-deep h4 {
      margin: 16px 0 8px;
      font-weight: 600;
      line-height: 1.3;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }
    .content ::ng-deep h1 { font-size: 1.5em; }
    .content ::ng-deep h2 { font-size: 1.3em; }
    .content ::ng-deep h3 { font-size: 1.15em; }
    .content ::ng-deep h4 { font-size: 1.05em; }
    .content ::ng-deep p {
      margin: 0 0 8px;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }
    .content ::ng-deep p:last-child { margin-bottom: 0; }
    .content ::ng-deep ul,
    .content ::ng-deep ol {
      margin: 8px 0;
      padding-inline-start: 24px;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }
    .content ::ng-deep li {
      margin-bottom: 4px;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }
    .content ::ng-deep pre {
      margin: 12px 0;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
      direction: ltr;
      text-align: left;
    }
    .content ::ng-deep code {
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.9em;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--bg-tertiary);
    }
    .content ::ng-deep pre code {
      padding: 0;
      background: none;
    }
    .content ::ng-deep blockquote {
      margin: 8px 0;
      padding: 8px 16px;
      border-inline-start: 3px solid var(--accent-color);
      color: var(--text-secondary);
      font-style: italic;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }
    .content ::ng-deep hr {
      margin: 16px 0;
      border: none;
      border-top: 1px solid var(--border-color);
    }
    .content ::ng-deep a { color: var(--accent-color); text-decoration: underline; }
    .content ::ng-deep img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
    .content ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 14px;
      direction: rtl;
      unicode-bidi: plaintext;
    }
    .content ::ng-deep th,
    .content ::ng-deep td {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      text-align: start;
    }
    .content ::ng-deep th {
      background: var(--bg-tertiary);
      font-weight: 600;
    }

    .user-message .content ::ng-deep code {
      background: rgba(255,255,255,0.15);
    }
    .user-message .content ::ng-deep pre {
      background: rgba(0,0,0,0.15);
    }
    .user-message .content ::ng-deep a {
      color: #ffffff;
      text-decoration: underline;
    }
    .user-message .content ::ng-deep blockquote {
      border-inline-start-color: rgba(255,255,255,0.5);
      color: rgba(255,255,255,0.85);
    }
    .user-message .content ::ng-deep th,
    .user-message .content ::ng-deep td {
      border-color: rgba(255,255,255,0.2);
    }
    .user-message .content ::ng-deep th {
      background: rgba(255,255,255,0.1);
    }

    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: all var(--transition);
      opacity: 0;
    }
    .bubble:hover .copy-btn {
      opacity: 1;
    }
    .copy-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .copy-btn.copied {
      opacity: 1;
      color: var(--accent-color);
    }

    .references {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      font-size: 13px;
    }

    .assistant-message .references {
      border-top-color: var(--border-soft);
    }

    .references summary {
      cursor: pointer;
      color: var(--text-tertiary);
      font-weight: 500;
      margin-bottom: 8px;
      display: block;
    }

    .user-message .references summary {
      color: rgba(255,255,255,0.8);
    }

    .references ol {
      margin-top: 8px;
      padding-left: 20px;
    }

    .references li {
      color: var(--text-secondary);
      margin-bottom: 6px;
      line-height: 1.5;
    }

    .user-message .references li {
      color: rgba(255,255,255,0.8);
    }

    .ref-file {
      font-weight: 600;
    }

    .ref-content {
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .user-message .ref-content {
      color: rgba(255,255,255,0.65);
    }
  `]
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();

  copyContent(): void {
    const text = this.message().content;
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
