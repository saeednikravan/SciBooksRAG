import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ChatMessage, QueryRequest, QueryDataRequest, QueryResponse, QueryDataResponse, StreamChunk } from '../models/chat.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = inject(ApiService);

  query(request: QueryRequest): Observable<QueryResponse> {
    return this.api.post<QueryResponse>('/query', request);
  }

  queryStream(request: QueryRequest): Observable<StreamChunk> {
    return new Observable(observer => {
      const token = localStorage.getItem('scibooksrag_token');
      const url = `${environment.apiBaseUrl}/query/stream`;
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(request)
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.trim()) continue;
              let parsed: any;
              const jsonLine = line.startsWith('data: ') ? line.slice(6) : line;
              try {
                parsed = JSON.parse(jsonLine);
              } catch {
                continue;
              }
              if (parsed.type === 'error') {
                observer.error(new Error(parsed.error || 'Stream error'));
                observer.complete();
                return;
              }
              if (parsed.type === 'chunk') {
                const content = parsed.text || parsed.data?.response || parsed.data?.content || parsed.content || parsed.message || '';
                if (content) {
                  observer.next({ type: 'chunk', data: { content } } as StreamChunk);
                }
              } else if (parsed.type === 'final' && parsed.data?.response) {
                observer.next({ type: 'final', data: parsed.data } as StreamChunk);
              } else if (parsed.type === 'info') {
                observer.next({ type: 'info', data: { content: parsed.content || parsed.content } } as StreamChunk);
              } else if (parsed.type === 'references' && parsed.data?.references) {
                observer.next({ type: 'references', data: parsed.data } as StreamChunk);
              }
            }
            read();
          }).catch(err => {
            observer.error(err);
            observer.complete();
          });
        };
        read();
      }).catch(err => {
        observer.error(err);
        observer.complete();
      });
    });
  }

  queryData(
    request: QueryDataRequest
  ): Observable<{ status: string; data: QueryDataResponse }> {
    return this.api.post<{ status: string; data: QueryDataResponse }>('/query/data', request);
  }

  getConversationHistory(): Array<{ role: string; content: string }> {
    try {
      const history = localStorage.getItem('scibooksrag_chat_history');
      return history ? JSON.parse(history) : [];
    } catch { return []; }
  }

  saveToHistory(messages: ChatMessage[]): void {
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));
    localStorage.setItem('scibooksrag_chat_history', JSON.stringify(history));
  }
}
