import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy, effect, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HeaderComponent } from '../../layout/header/header.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatGraphViewerComponent } from './chat-graph-viewer/chat-graph-viewer.component';
import { ChatService } from '../../core/services/chat.service';
import { ChatStateService } from '../../core/services/chat-state.service';
import { ChatMessage, QueryMode, StreamChunk } from '../../core/models/chat.model';

const HISTORY_KEY = 'scibooksrag_chat_history';

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
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 32px 125px;
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

    /* Message list */
    .msg-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .msg-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      position: relative;
    }

    .msg-item > app-chat-message {
      flex: 1;
      min-width: 0;
    }

    /* Delete button */
    .delete-btn {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      margin-top: 48px;
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
    .msg-item:hover .delete-btn {
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
      flex: 0 0 50%;
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

    .mode-toggle {
      display: flex;
      justify-content: center;
      gap: 0;
      margin-bottom: 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-color);
      padding: 3px;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
    }

    .mode-btn {
      padding: 6px 18px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
      white-space: nowrap;
    }

    .mode-btn:hover:not(:disabled) {
      color: var(--text-primary);
    }

    .mode-btn.active {
      background: var(--accent-color);
      color: #ffffff;
      box-shadow: var(--shadow-sm);
    }

    .mode-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      color: var(--text-primary);
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

    .stop-btn {
      background: var(--danger-color, #c64545);
    }

    .stop-btn:hover {
      background: var(--danger-hover, #a83232) !important;
      transform: scale(1.02);
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
export class ChatComponent implements AfterViewInit, OnInit, OnDestroy {
 private chatService = inject(ChatService);
  private chatState = inject(ChatStateService);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('scrollArea') scrollArea!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  query = '';
  mode = signal<QueryMode>('hi');
  isLoading = signal(false);
  isStreaming = signal(false);
  error = signal('');

  private destroy$ = new Subject<void>();

  availableModes: { value: QueryMode; label: string }[] = [
    { value: 'hi', label: 'With knowledge' },
    { value: 'bypass', label: 'Without knowledge' }
  ];

  constructor() {
    effect(() => {
      const msgs = this.messages();
      this.chatState.messageCount.set(msgs.length);
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  ngOnInit() {
    this.loadHistory();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendMessage(): void {
    const q = this.query.trim();
    if (!q || this.isLoading()) return;

    this.query = '';
    this.error.set('');
    this.isLoading.set(true);
    this.isStreaming.set(true);

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
    let subscription: any;

    if (currentMode === 'bypass') {
 subscription = this.chatService.llmStream(q).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.data?.content) {
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.content += chunk.data!.content!;
              }
              return updated;
            });
            this.cdr.markForCheck();
          } else if (chunk.type === 'final') {
            this.isStreaming.set(false);
            this.isLoading.set(false);
            this.saveHistory();
          } else if (chunk.type === 'error') {
            this.error.set(chunk.data?.content || 'Stream error');
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.content = `Error: ${chunk.data?.content || 'Stream failed'}`;
              }
              return updated;
            });
            this.isStreaming.set(false);
            this.isLoading.set(false);
            this.saveHistory();
          }
        },
        complete: () => {
          this.isStreaming.set(false);
          this.isLoading.set(false);
          this.messages.update(m => {
            const updated = [...m];
            const last = updated[updated.length - 1];
            if (last && last.id === assistantMsg.id && !last.content) {
              last.content = '(empty response)';
            }
            return updated;
          });
          this.saveHistory();
        },
        error: (err) => {
          this.isStreaming.set(false);
          this.isLoading.set(false);
          this.error.set(err.message || 'Stream request failed');
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
    } else {
      this.chatService.queryStream({
        query: q,
        mode: currentMode,
        response_type: 'Multiple Paragraphs',
        level: 2,
        top_k: 20,
        top_m: 10,
        max_token_for_text_unit: 0,
        max_token_for_local_context: 0,
        max_token_for_bridge_knowledge: 0,
        max_token_for_community_report: 0,
        community_single_one: false,
        include_graph: true
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.data?.content) {
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.content += chunk.data!.content!;
              }
              return updated;
            });
            this.cdr.markForCheck();
          } else if (chunk.type === 'info' && chunk.data?.content) {
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.processingInfo = chunk.data!.content!;
              }
              return updated;
            });
          } else if (chunk.type === 'references' && chunk.data?.references) {
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.references = chunk.data!.references!;
              }
              return updated;
            });
          } else if (chunk.type === 'final') {
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                if (chunk.data?.response && last.content.length === 0) {
                  last.content = chunk.data.response;
                }
                if (chunk.data?.nodes && chunk.data?.edges) {
                  const entities = chunk.data.nodes.map((n, i) => ({
                    entity_name: n.entity_name,
                    entity_type: n.entity_type,
                    description: n.description,
                    source_id: n.source_id,
                    file_path: '',
                    created_at: '',
                    reference_id: `node_${i}`
                  }));
                  const relationships = chunk.data.edges.map((e, i) => ({
                    src_id: e.source,
                    tgt_id: e.target,
                    description: e.description,
                    keywords: '',
                    weight: e.weight,
                    source_id: '',
                    file_path: '',
                    reference_id: `edge_${i}`
                  }));
                  last.graphData = {
                    entities,
                    relationships,
                    chunks: [],
                    references: []
                  };
                }
              }
              return updated;
            });
            this.isStreaming.set(false);
            this.isLoading.set(false);
            this.saveHistory();
          } else if (chunk.type === 'error') {
            this.error.set(chunk.data?.content || 'Stream error');
            this.messages.update(m => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              if (last && last.id === assistantMsg.id) {
                last.content = `Error: ${chunk.data?.content || 'Stream failed'}`;
              }
              return updated;
            });
            this.isStreaming.set(false);
            this.isLoading.set(false);
            this.saveHistory();
          }
        },
        complete: () => {
          this.isStreaming.set(false);
          this.isLoading.set(false);
          this.messages.update(m => {
            const updated = [...m];
            const last = updated[updated.length - 1];
            if (last && last.id === assistantMsg.id && !last.content) {
              last.content = '(empty response)';
            }
            return updated;
          });
          this.saveHistory();
        },
        error: (err) => {
          this.isStreaming.set(false);
          this.isLoading.set(false);
          this.error.set(err.message || 'Stream request failed');
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
  }

  stopStreaming(): void {
    this.destroy$.next();
    this.isStreaming.set(false);
    this.isLoading.set(false);
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
