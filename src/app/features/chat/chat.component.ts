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
    .chat-page { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--bg-primary); }
    .chat-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }

    /* Messages area - full width, centered content like ChatGPT */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: var(--bg-primary);
    }

    .messages-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 32px 120px;
    }

    /* Empty state - centered, minimal */
    .empty-state {
      text-align: center;
      padding: 120px 24px 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      color: var(--accent-color);
      opacity: 0.6;
    }

    .empty-icon svg { width: 100%; height: 100%; }
    .empty-state h3 {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .empty-state p {
      font-size: 15px;
      color: var(--text-tertiary);
      max-width: 400px;
      line-height: 1.6;
    }
    .mode-hints {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .mode-hint {
      padding: 8px 18px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 500;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
      border: 1px solid var(--border-color);
      user-select: none;
    }
    .mode-hint:hover {
      background: var(--bg-cream-strong);
      border-color: var(--border-soft);
    }
    .mode-hint.active {
      background: var(--accent-color);
      color: #ffffff;
      border-color: var(--accent-color);
    }

    /* Streaming indicator */
    .streaming-indicator {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: var(--text-tertiary);
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }
    .typing-dot {
      width: 8px;
      height: 8px;
      background: var(--accent-color);
      border-radius: 50%;
      animation: pulse 1.2s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

    /* Message rows */
    .msg-row {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }
    .msg-row .msg-content { flex: 1; min-width: 0; }
    .msg-row .msg-content ::ng-deep .message { margin-bottom: 0 !important; }

    /* User messages - right aligned */
    .user-msg-wrapper {
      display: flex;
      justify-content: flex-end;
    }
    .user-msg-wrapper .msg-row {
      justify-content: flex-end;
    }

    /* Delete button */
    .delete-btn {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      margin-top: 8px;
      border: none;
      border-radius: var(--radius);
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: all var(--transition);
      opacity: 0;
    }
    .msg-row:hover .delete-btn {
      opacity: 1;
    }
    .delete-btn:hover {
      color: var(--danger-color);
      background: rgba(198,69,69,0.08);
    }

    /* Split message (text + graph) */
    .split-message {
      display: flex;
      gap: 16px;
      min-height: 0;
      width: 100%;
    }
    .split-text {
      flex: 0 0 35%;
      min-width: 0;
    }
    .split-text ::ng-deep .message { margin-bottom: 0 !important; }
    .split-text ::ng-deep .bubble { max-width: 100% !important; }
    .split-graph {
      flex: 1;
      min-width: 0;
    }
    .split-graph ::ng-deep .graph-body { height: 560px !important; }

    /* Error banner */
    .error-banner {
      padding: 14px 18px;
      background: rgba(198,69,69,0.06);
      color: var(--danger-color);
      border-radius: var(--radius-lg);
      font-size: 13px;
      margin: 0 0 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(198,69,69,0.12);
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Input area - fixed bottom, centered card */
    .input-area {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 24px 24px;
      background: linear-gradient(to top, var(--bg-primary) 60%, transparent);
      pointer-events: none;
    }

    .input-container {
      max-width: 800px;
      margin: 0 auto;
      pointer-events: auto;
    }

    .mode-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .mode-label {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .mode-select {
      width: 150px;
      padding: 6px 30px 6px 12px;
      font-size: 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
    }

    .mode-select:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px rgba(204, 120, 92, 0.15);
    }

    .input-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 8px 8px 8px 20px;
      box-shadow: var(--shadow-lg);
      transition: all var(--transition);
    }

    .input-row:focus-within {
      border-color: var(--accent-color);
      box-shadow: var(--shadow-lg), 0 0 0 3px rgba(204, 120, 92, 0.1);
    }

    .chat-input {
      flex: 1;
      border: none;
      padding: 8px 0;
      font-size: 15px;
      min-height: 24px;
      max-height: 150px;
      resize: none;
      background: transparent;
      line-height: 1.5;
      outline: none;
    }

    .chat-input::placeholder {
      color: var(--text-muted);
    }

    .send-btn {
      padding: 10px 18px;
      font-size: 13px;
      border-radius: var(--radius-lg);
      background: var(--accent-color);
      color: #ffffff;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 38px;
      min-width: 38px;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: scale(1.02);
    }

    .send-btn:disabled {
      background: var(--bg-tertiary);
      color: var(--text-muted);
      cursor: not-allowed;
      transform: none;
    }

    .clear-btn {
      width: 38px;
      height: 38px;
      border: none;
      border-radius: var(--radius-lg);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition);
      flex-shrink: 0;
    }

    .clear-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .loading-spinner-small {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
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
        this.saveHistory();
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
        this.saveHistory();
      }
    });
  }

  deleteMessage(msgId: string): void {
    this.messages.update(m => {
      const idx = m.findIndex(msg => msg.id === msgId);
      if (idx === -1) return m;
      const msg = m[idx];
      let deleteCount = 1;
      // If deleting a user message, also remove the following assistant response
      if (msg.role === 'user' && idx + 1 < m.length && m[idx + 1].role === 'assistant') {
        deleteCount = 2;
      }
      // If deleting an assistant message, also remove the preceding user message
      if (msg.role === 'assistant' && idx - 1 >= 0 && m[idx - 1].role === 'user') {
        const updated = [...m];
        updated.splice(idx - 1, 2);
        return updated;
      }
      const updated = [...m];
      updated.splice(idx, deleteCount);
      return updated;
    });
    this.saveHistory();
  }

  clearConversation(): void {
    this.messages.set([]);
    this.error.set('');
    localStorage.removeItem(HISTORY_KEY);
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.messages()));
    } catch { /* ignore */ }
  }

  private loadHistory(): void {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        // Restore timestamp strings back to Date objects
        const restored = parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        this.messages.set(restored);
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
