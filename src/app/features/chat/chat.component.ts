import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage, QueryMode } from '../../core/models/chat.model';

const HISTORY_KEY = 'lightrag_chat_history';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, HeaderComponent, ChatMessageComponent],
  templateUrl: './chat.component.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; height: 100%; min-height: 0; }
    .chat-page { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .chat-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .messages-area { flex: 1; padding: 20px; overflow-y: auto; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
    .empty-icon { width: 48px; height: 48px; margin: 0 auto 12px; color: var(--text-muted); }
    .empty-icon svg { width: 100%; height: 100%; }
    .empty-state h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; margin-bottom: 16px; }
    .mode-hints { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .mode-hint { padding: 4px 10px; border-radius: 20px; font-size: 11px; background: var(--bg-tertiary); cursor: pointer; transition: all 0.15s; user-select: none; }
    .mode-hint:hover { background: var(--border-color); }
    .mode-hint.active { background: var(--accent-color); color: white; }
    .streaming-indicator { padding: 10px 14px; background: var(--bg-secondary); border-radius: var(--radius-lg); font-size: 13px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px; }
    .typing-dot { width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
    .input-area { padding: 12px 20px; border-top: 1px solid var(--border-color); background: var(--bg-primary); }
    .mode-selector { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .mode-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
    .mode-select { width: 140px; }
    .input-row { display: flex; gap: 8px; }
    .chat-input { flex: 1; padding: 10px 12px; font-size: 14px; }
    .loading-spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-banner { padding: 10px 14px; background: #fde8e8; color: #c0392b; border-radius: var(--radius); font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    :host-context([data-theme="dark"]) .error-banner { background: rgba(231,76,60,0.15); color: #f87171; }
  `]
})
export class ChatComponent implements AfterViewInit, OnInit {
  private chatService = inject(ChatService);
  @ViewChild('scrollArea') scrollArea!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  query = '';
  mode = signal<QueryMode>('hybrid');
  isStreaming = signal(false);
  streamingContent = signal('');
  error = signal('');

  availableModes: { value: QueryMode; label: string }[] = [
    { value: 'naive', label: 'Naive' },
    { value: 'local', label: 'Local' },
    { value: 'global', label: 'Global' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'mix', label: 'Mix' },
    { value: 'bypass', label: 'Bypass' }
  ];

  constructor() {
    effect(() => {
      this.messages();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  ngOnInit() {
    this.loadHistory();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const q = this.query.trim();
    if (!q || this.isStreaming()) return;

    this.query = '';
    this.error.set('');
    this.isStreaming.set(true);
    this.streamingContent.set('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date()
    };
    this.messages.update(m => [...m, userMsg]);

    const history = this.messages()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    this.chatService.queryStream({
      query: q,
      mode: this.mode(),
      stream: true,
      include_references: true,
      conversation_history: history
    }).subscribe({
      next: (chunk) => {
        this.streamingContent.update(c => c + chunk);
        this.messages.update(m => {
          const last = m[m.length - 1];
          if (last.role === 'assistant') {
            last.content = this.streamingContent();
          }
          return [...m];
        });
      },
      error: (err) => {
        this.isStreaming.set(false);
        this.error.set(err.message || 'Request failed. Check that the SciBooksRAG server is running.');
      },
      complete: () => {
        this.isStreaming.set(false);
        if (!this.messages().some(m => m.role === 'assistant' && m.content === this.streamingContent())) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: this.streamingContent() || '(empty response)',
            timestamp: new Date()
          };
          this.messages.update(m => [...m, assistantMsg]);
        }
      }
    });
  }

  clearConversation(): void {
    this.messages.set([]);
    this.error.set('');
    localStorage.removeItem(HISTORY_KEY);
  }

  private loadHistory(): void {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        this.messages.set(parsed);
      }
    } catch { /* ignore */ }
  }

  private scrollToBottom(): void {
    try {
      this.scrollArea?.nativeElement.scrollTo({
        top: this.scrollArea.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    } catch { /* ignore */ }
  }
}
