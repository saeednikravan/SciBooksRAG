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
          'Accept': 'application/x-ndjson'
        },
        body: JSON.stringify({ ...request, stream: true })
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              for (const line of buffer.split('\n')) {
                if (!line.trim()) continue;
                try {
                  const parsed = JSON.parse(line);
                  observer.next(detectChunk(parsed));
                } catch { /* skip */ }
              }
              observer.next({ type: 'done', data: {} });
              observer.complete();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                const chunk = detectChunk(parsed);
                observer.next(chunk);
                if (chunk.type === 'error') observer.error(new Error(chunk.data?.content));
              } catch { /* skip malformed line */ }
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

      function detectChunk(data: any): StreamChunk {
        if (data.type === 'chunk' || data.type === 'done' || data.type === 'error') {
          return data as StreamChunk;
        }
        if (data.response) {
          return { type: 'chunk', data: { content: data.response } };
        }
        if (data.references) {
          return { type: 'references', data: { references: data.references } };
        }
        if (data.graph_data || data.entities) {
          return { type: 'references', data: { graph_data: data } };
        }
        if (data.error) {
          return { type: 'error', data: { content: data.error } };
        }
        if (data.info || data.message || data.status || data.processing) {
          return { type: 'info', data: { content: data.info || data.message || data.status || data.processing || JSON.stringify(data) } };
        }
        return { type: 'chunk', data: { content: typeof data === 'string' ? data : JSON.stringify(data) } };
      }
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
