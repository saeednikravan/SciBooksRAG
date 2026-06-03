import { Component, input } from '@angular/core';
import { ChatMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-message',
  standalone: true,
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
}
