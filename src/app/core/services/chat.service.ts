import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ChatMessage, QueryRequest, QueryResponse } from '../models/chat.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = inject(ApiService);

  query(request: QueryRequest): Observable<QueryResponse> {
    return this.api.post<QueryResponse>('/query', request);
  }

  queryStream(request: QueryRequest): Observable<string> {
    return new Observable(observer => {
      const token = localStorage.getItem('lightrag_token');
      const url = `${environment.apiBaseUrl}/query/stream`;
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson'
        },
        body: JSON.stringify({ ...request, stream: true })
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) { observer.complete(); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  accumulated += data.response;
                  observer.next(data.response);
                }
                if (data.error) {
                  observer.error(new Error(data.error));
                }
              } catch { observer.next(line); }
            }
            read();
          }).catch(err => observer.error(err));
        };
        read();
      }).catch(err => observer.error(err));
    });
  }

  getConversationHistory(): Array<{ role: string; content: string }> {
    try {
      const history = localStorage.getItem('lightrag_chat_history');
      return history ? JSON.parse(history) : [];
    } catch { return []; }
  }

  saveToHistory(messages: ChatMessage[]): void {
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));
    localStorage.setItem('lightrag_chat_history', JSON.stringify(history));
  }
}
