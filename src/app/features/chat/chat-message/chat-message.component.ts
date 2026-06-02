import { Component, input } from '@angular/core';
import { ChatMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  templateUrl: './chat-message.component.html',
  styles: [`
    .message { display: flex; gap: 10px; margin-bottom: 16px; }
    .user-message { flex-direction: row-reverse; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); flex-shrink: 0; color: var(--text-secondary); }
    .user-message .avatar { background: var(--accent-color); color: white; }
    .bubble { max-width: 75%; padding: 10px 14px; border-radius: var(--radius-lg); background: var(--bg-secondary); }
    .user-message .bubble { background: var(--accent-color); color: white; }
    .content { font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .references { margin-top: 8px; font-size: 12px; }
    .references summary { cursor: pointer; color: var(--text-secondary); }
    .references ol { margin-top: 4px; padding-left: 20px; }
    .references li { color: var(--text-secondary); margin-bottom: 4px; }
    .ref-file { font-weight: 500; }
    .ref-content { margin-top: 2px; font-size: 11px; }
    .user-message .references summary { color: rgba(255,255,255,0.8); }
    .user-message .references li { color: rgba(255,255,255,0.7); }
  `]
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
}
