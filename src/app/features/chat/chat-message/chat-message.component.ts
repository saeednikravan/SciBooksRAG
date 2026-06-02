import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { ChatGraphComponent } from '../chat-graph/chat-graph.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, ChatGraphComponent],
  template: `
    <div class="message" [class.user]="message().role === 'user'" [class.assistant]="message().role === 'assistant'">
      <div class="avatar">
        @if (message().role === 'user') {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        } @else {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        }
      </div>
      <div class="bubble">
        <div class="content">{{ message().content }}</div>

        @if (message().graph && message().graph!.nodes.length > 0) {
          <app-chat-graph [data]="message().graph!" />
        }

        @if (message().references && message().references!.length > 0) {
          <div class="references">
            <div class="ref-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>References</span>
            </div>
            <div class="ref-list">
              @for (ref of message().references; track ref.reference_id) {
                <div class="ref-item">
                  <span class="ref-id">{{ ref.reference_id }}</span>
                  <span class="ref-path">{{ ref.file_path }}</span>
                </div>
              }
            </div>
          </div>
        }

        <div class="timestamp">{{ message().timestamp | date:'HH:mm' }}</div>
      </div>
    </div>
  `,
  styles: [`
    .message { display:flex; gap:12px; margin-bottom:20px; max-width:85%; }
    .message.user { flex-direction:row-reverse; margin-left:auto; }
    .message.assistant { margin-right:auto; }
    .avatar { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .user .avatar { background:#22c55e; color:#fff; }
    .assistant .avatar { background:#1e293b; color:#22c55e; }
    .bubble { padding:12px 16px; border-radius:14px; font-size:14px; line-height:1.7; min-width:0; }
    .user .bubble { background:#22c55e; color:#fff; border-bottom-right-radius:4px; }
    .assistant .bubble { background:#f1f5f9; color:#0f172a; border-bottom-left-radius:4px; }
    .content { white-space:pre-wrap; word-break:break-word; }
    .references { margin-top:12px; padding-top:10px; border-top:1px solid rgba(0,0,0,0.08); }
    .ref-header { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#64748b; margin-bottom:8px; }
    .ref-list { display:flex; flex-direction:column; gap:4px; }
    .ref-item { display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(0,0,0,0.04); border-radius:6px; font-size:12px; }
    .ref-id { font-weight:600; color:#22c55e; font-family:monospace; font-size:11px; }
    .ref-path { color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .timestamp { font-size:11px; color:#94a3b8; margin-top:6px; text-align:right; }
    .user .timestamp { color:rgba(255,255,255,0.7); }
  `]
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
}
