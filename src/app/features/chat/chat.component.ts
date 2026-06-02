import {
  Component,
  OnInit,
  signal,
  inject,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChatMessage, QueryRequest } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { GraphService } from '../../core/services/graph.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { HeaderComponent } from '../../layout/header/header.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ChatMessageComponent, HeaderComponent],
  template: `
    <div class="chat-page">
      <app-header title="Chat" />

      <div class="chat-messages" #messagesContainer>
        @if (messages().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Welcome to SciBooksRAG</h3>
            <p>Ask questions about your knowledge base using RAG-powered search</p>
            <div class="suggestions">
              @for (suggestion of suggestions; track suggestion) {
                <button class="suggestion-chip" (click)="useSuggestion(suggestion)">
                  {{ suggestion }}
                </button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <app-chat-message [message]="msg" />
        }

        @if (isLoading()) {
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        }
      </div>

      <div class="chat-input-bar">
        <div class="mode-selector">
          <select [(ngModel)]="selectedMode" name="mode" [disabled]="isLoading()">
            @for (mode of availableModes; track mode.value) {
              <option [value]="mode.value">{{ mode.label }}</option>
            }
          </select>
          @if (messages().length > 0) {
            <button class="clear-btn" (click)="clearChat()" title="Clear chat history">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Clear
            </button>
          }
        </div>
        <div class="input-wrapper">
          <textarea
            [(ngModel)]="newMessage"
            name="message"
            placeholder="Type your message..."
            (keydown.enter)="sendMessage(); $event.preventDefault()"
            [disabled]="isLoading()"
            rows="1"
          ></textarea>
          <button
            class="send-btn"
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || isLoading()"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-page {
      display: flex; flex-direction: column; height: 100vh;
      background: #ffffff;
    }
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 24px;
      scroll-behavior: smooth;
    }
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100%; text-align: center; gap: 12px;
    }
    .empty-icon {
      width: 80px; height: 80px; border-radius: 20px;
      background: #f0fdf4; color: #22c55e;
      display: flex; align-items: center; justify-content: center;
    }
    .empty-state h3 { font-size: 18px; color: #0f172a; margin: 0; }
    .empty-state p { font-size: 14px; color: #64748b; margin: 0; max-width: 360px; }
    .suggestions {
      display: flex; flex-wrap: wrap; gap: 8px;
      justify-content: center; margin-top: 8px;
    }
    .suggestion-chip {
      padding: 8px 16px; border-radius: 20px;
      border: 1.5px solid #e2e8f0; background: #f8fafc;
      color: #334155; font-size: 13px; cursor: pointer;
      transition: all 0.15s;
    }
    .suggestion-chip:hover { border-color: #22c55e; color: #22c55e; background: #f0fdf4; }
    .typing-indicator {
      display: flex; gap: 4px; padding: 16px 20px;
      margin-right: auto; margin-bottom: 20px;
    }
    .typing-indicator span {
      width: 8px; height: 8px; border-radius: 50%;
      background: #94a3b8; animation: typing 1.4s infinite;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
      30% { opacity: 1; transform: scale(1.2); }
    }
    .chat-input-bar {
      border-top: 1px solid #e2e8f0;
      padding: 16px 24px;
      background: #ffffff;
    }
    .mode-selector {
      margin-bottom: 8px;
    }
    .mode-selector select {
      padding: 6px 12px; border: 1.5px solid #e2e8f0;
      border-radius: 8px; font-size: 13px; color: #334155;
      background: #f8fafc; cursor: pointer; outline: none;
    }
    .mode-selector select:focus { border-color: #22c55e; }
    .clear-btn {
      padding: 5px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: #fff; color: #64748b; cursor: pointer; font-size: 12px;
      display: inline-flex; align-items: center; gap: 4px;
      transition: all .15s;
    }
    .clear-btn:hover { border-color: #ef4444; color: #ef4444; }
    .input-wrapper {
      display: flex; align-items: flex-end; gap: 8px;
      background: #f8fafc; border: 1.5px solid #e2e8f0;
      border-radius: 14px; padding: 8px 12px;
      transition: border-color 0.2s;
    }
    .input-wrapper:focus-within { border-color: #22c55e; }
    .input-wrapper textarea {
      flex: 1; border: none; background: transparent;
      outline: none; font-size: 14px; color: #0f172a;
      resize: none; font-family: inherit; line-height: 1.5;
      max-height: 120px;
    }
    .input-wrapper textarea::placeholder { color: #94a3b8; }
    .send-btn {
      width: 36px; height: 36px; border-radius: 10px;
      border: none; background: #22c55e; color: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: opacity 0.2s; flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { opacity: 0.85; }
    .send-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked {
  private chatService = inject(ChatService);
  private graphService = inject(GraphService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  newMessage = '';
  selectedMode = 'mix';
  isLoading = signal(false);

  availableModes = [
    { value: 'naive', label: 'Naive' },
    { value: 'local', label: 'Local' },
    { value: 'global', label: 'Global' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'mix', label: 'Mix' },
    { value: 'bypass', label: 'Bypass' }
  ];

  suggestions = [
    'What are the key insights from the latest data?',
    'Summarize the main topics in the knowledge graph',
    'Find relationships between key entities',
    'Explain the hybrid search mode'
  ];

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadHistory();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private loadHistory(): void {
    const history = this.chatService.getConversationHistory();
    if (history.length > 0) {
      const restored = history.map((h, i) => ({
        id: `hist-${Date.now()}-${i}`,
        role: h.role as 'user' | 'assistant',
        content: h.content,
        timestamp: new Date()
      }));
      this.messages.set(restored);
    }
  }

  clearChat(): void {
    this.messages.set([]);
    this.chatService.clearHistory();
  }

  useSuggestion(text: string): void {
    this.newMessage = text;
    this.sendMessage();
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isLoading()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: this.newMessage.trim(),
      timestamp: new Date()
    };
    this.messages.update((msgs) => [...msgs, userMsg]);

    const queryText = this.newMessage.trim();
    this.newMessage = '';

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      references: []
    };
    this.messages.update((msgs) => [...msgs, assistantMsg]);
    this.isLoading.set(true);

    const queryRequest: QueryRequest = {
      query: queryText,
      mode: this.selectedMode as QueryRequest['mode'],
      stream: true,
      include_references: true,
      conversation_history: this.messages()
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))
    };

    this.streamResponse(queryRequest, assistantMsg);
  }

  private async streamResponse(
    request: QueryRequest,
    assistantMsg: ChatMessage
  ): Promise<void> {
    try {
      const reader = await this.chatService.queryStream(request);
      const decoder = new TextDecoder();
      let fullContent = '';

      const processChunk = async (): Promise<void> => {
        const result = await reader.read();
        if (result.done) {
          this.isLoading.set(false);
          this.chatService.saveToHistory(this.messages());
          this.fetchGraphForMessage(request.query, assistantMsg);
          return;
        }

        const text = decoder.decode(result.value, { stream: true });
        const lines = text.split('\n');
        let hasData = false;

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullContent += data.response;
              assistantMsg.content = fullContent;
              hasData = true;
            }
            if (data.references) {
              assistantMsg.references = data.references;
            }
            if (data.error) {
              assistantMsg.content += `\n\n**خطا:** ${data.error}`;
            }
          } catch {
            // partial chunk, accumulate
            if (line.trim()) {
              fullContent += line.trim();
              assistantMsg.content = fullContent;
              hasData = true;
            }
          }
        }

        if (hasData) {
          this.messages.update((msgs) => [...msgs]);
        }

        await processChunk();
      };

      await processChunk();
    } catch (err) {
      this.isLoading.set(false);
      assistantMsg.content += '\n\nError receiving response. Make sure the SciBooksRAG server is running.';
      this.messages.update((msgs) => [...msgs]);
    }
  }

  private async fetchGraphForMessage(query: string, msg: ChatMessage): Promise<void> {
    try {
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (!words.length) return;

      // Try the first word directly as a label
      const label = words[0];
      console.log('[Graph] Fetching for label:', label);
      const data: any = await firstValueFrom(this.graphService.getKnowledgeGraph(label, 2, 50));
      console.log('[Graph] API response:', data);

      if (data) {
        const nodes = data.nodes || data.data?.nodes || [];
        const edges = data.edges || data.data?.edges || [];
        if (nodes.length > 0) {
          msg.graph = { nodes, edges };
          this.messages.update((msgs) => [...msgs]);
          console.log('[Graph] Set on message, nodes:', nodes.length);
        } else {
          console.log('[Graph] No nodes in response');
        }
      }
    } catch (e) {
      console.warn('[Graph] Fetch failed:', e);
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }
}
