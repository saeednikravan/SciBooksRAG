import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [MarkdownPipe, DatePipe],
  templateUrl: './chat-message.component.html',
  styles: [`
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      position: relative;
    }

    .message.is-user {
      flex-direction: row-reverse;
    }

    .msg-icon {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 20px;
    }

    .is-assistant .msg-icon {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: #fff;
    }

    .is-user .msg-icon {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .msg-icon svg {
      width: 16px;
      height: 16px;
    }

    .msg-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      max-width: 75%;
    }

    .is-user .msg-body {
      align-items: flex-end;
    }

    .msg-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 4px;
    }

    .is-user .msg-label {
      flex-direction: row-reverse;
    }

    .label-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      letter-spacing: 0.3px;
    }

    .is-user .label-text {
      color: var(--accent-color);
    }

    .msg-time {
      font-size: 11px;
      color: var(--text-muted);
    }

    .bubble {
      padding: 14px 18px;
      border-radius: 16px;
      line-height: 1.65;
      position: relative;
      width: 100%;
    }

    .is-assistant .bubble {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-top-left-radius: 4px;
    }

    .is-user .bubble {
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

    .is-user .content {
      color: #fff;
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

    .is-user .content ::ng-deep code {
      background: rgba(255,255,255,0.15);
    }
    .is-user .content ::ng-deep pre {
      background: rgba(0,0,0,0.15);
    }
    .is-user .content ::ng-deep a {
      color: #ffffff;
      text-decoration: underline;
    }
    .is-user .content ::ng-deep blockquote {
      border-inline-start-color: rgba(255,255,255,0.5);
      color: rgba(255,255,255,0.85);
    }
    .is-user .content ::ng-deep th,
    .is-user .content ::ng-deep td {
      border-color: rgba(255,255,255,0.2);
    }
    .is-user .content ::ng-deep th {
      background: rgba(255,255,255,0.1);
    }

    .cursor-blink {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: var(--accent-color);
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: blink 0.7s step-end infinite;
    }

    @keyframes blink {
      50% { opacity: 0; }
    }

    .msg-actions {
      display: flex;
      gap: 4px;
      padding: 2px 4px;
      opacity: 0;
      transition: opacity 150ms ease;
    }

    .message:hover .msg-actions {
      opacity: 1;
    }

    .is-user .msg-actions {
      justify-content: flex-end;
    }

    .action-btn {
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: all var(--transition);
    }

    .action-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .references {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      font-size: 13px;
    }

    .is-assistant .references {
      border-top-color: var(--border-soft);
    }

    .references summary {
      cursor: pointer;
      color: var(--text-tertiary);
      font-weight: 500;
      margin-bottom: 8px;
      display: block;
    }

    .is-user .references summary {
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

    .is-user .references li {
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

    .is-user .ref-content {
      color: rgba(255,255,255,0.65);
    }

    .processing-info {
      width: 100%;
      margin-bottom: 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      border: 1px solid var(--border-soft);
      font-size: 13px;
      overflow: hidden;
    }

    .processing-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
    }

    .processing-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--text-tertiary);
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
      user-select: none;
    }

    .processing-toggle .chevron {
      width: 12px;
      height: 12px;
      transition: transform 200ms ease;
    }

    .processing-toggle .chevron.expanded {
      transform: rotate(180deg);
    }

    .processing-content {
      padding: 0 12px 8px;
      color: var(--text-secondary);
      line-height: 1.5;
      max-height: 4.5em;
      overflow-y: auto;
      transition: max-height 300ms ease-in-out;
    }

    .processing-content.expanded {
      max-height: none;
    }

    .think-section {
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      border: 1px solid var(--border-soft);
      margin-bottom: 8px;
      overflow: hidden;
      width: 100%;
    }

    .think-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--bg-secondary);
    }

    .think-icon {
      width: 14px;
      height: 14px;
      color: var(--text-tertiary);
      flex-shrink: 0;
    }

    .think-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .think-toggle {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--text-tertiary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all var(--transition);
    }

    .think-toggle:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    .think-toggle .chevron {
      width: 12px;
      height: 12px;
      transition: transform 200ms ease;
    }

    .think-toggle .chevron.expanded {
      transform: rotate(180deg);
    }

    .think-body {
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-secondary);
      max-height: 4.65em;
      overflow: hidden;
      transition: max-height 300ms ease-in-out;
    }

    .think-section.expanded .think-body {
      max-height: none;
    }

    .think-body ::ng-deep p {
      margin: 0 0 4px;
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
    }

    .think-body ::ng-deep p:last-child {
      margin-bottom: 0;
    }
  `]
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
  isStreaming = input(false);
  processingInfo = input<string>('');
  isProcessingExpanded = signal(false);
  isThinkExpanded = signal(false);

  get thinkContent(): string {
    const match = this.message().content.match(/<think>([\s\S]*?)<\/think>/);
    return match ? match[1].trim() : '';
  }

  get mainContent(): string {
    return this.message().content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  toggleProcessing(): void {
    this.isProcessingExpanded.update(v => !v);
  }

  toggleThink(): void {
    this.isThinkExpanded.update(v => !v);
  }

  copyContent(): void {
    const think = this.thinkContent;
    const main = this.mainContent;
    const text = think ? `[Thinking]\n${think}\n\n[Answer]\n${main}` : main;
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
