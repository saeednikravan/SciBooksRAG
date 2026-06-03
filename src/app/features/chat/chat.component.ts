import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../layout/header/header.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatGraphViewerComponent } from './chat-graph-viewer/chat-graph-viewer.component';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage, QueryMode } from '../../core/models/chat.model';

const HISTORY_KEY = 'lightrag_chat_history';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, HeaderComponent, ChatMessageComponent, ChatGraphViewerComponent],
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
    .split-message { display: flex; gap: 12px; margin-bottom: 16px; min-height: 0; }
    .split-text { flex: 0 0 45%; min-width: 0; }
    .split-text ::ng-deep .message { margin-bottom: 0 !important; }
    .split-text ::ng-deep .bubble { max-width: 100% !important; }
    .split-graph { flex: 0 0 calc(55% - 12px); min-width: 0; }
    .split-graph ::ng-deep .graph-body { height: 480px !important; }
  `]
})
export class ChatComponent implements AfterViewInit, OnInit {
  private chatService = inject(ChatService);
  @ViewChild('scrollArea') scrollArea!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  query = '';
  mode = signal<QueryMode>('hybrid');
  isLoading = signal(false);
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
    if (!q || this.isLoading()) return;

    this.query = '';
    this.error.set('');
    this.isLoading.set(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date()
    };
    this.messages.update(m => [...m, userMsg]);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    this.messages.update(m => [...m, assistantMsg]);

    const history = this.messages()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const currentMode = this.mode();

    forkJoin({
      text: this.chatService.query({
        query: q,
        mode: currentMode,
        include_references: true,
        response_type: 'Multiple Paragraphs',
        top_k: 10,
        conversation_history: history
      }),
      graph: this.chatService.queryData({
        query: q,
        mode: currentMode,
        top_k: 10,
        chunk_top_k: 10,
        conversation_history: history,
        history_turns: history.length
      })
    }).subscribe({
      next: (result) => {
        this.messages.update(m => {
          const updated = [...m];
          const last = updated[updated.length - 1];
          if (last && last.id === assistantMsg.id) {
            last.content = result.text.response || '(empty response)';
            last.references = result.text.references;
            last.graphData = result.graph?.data || null;
          }
          return updated;
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.message || 'Request failed. Check that the SciBooksRAG server is running.');
        this.messages.update(m => {
          const updated = [...m];
          const last = updated[updated.length - 1];
          if (last && last.id === assistantMsg.id) {
            last.content = `Error: ${err.message || 'Request failed'}`;
          }
          return updated;
        });
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
