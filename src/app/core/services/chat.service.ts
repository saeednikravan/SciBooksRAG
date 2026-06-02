import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { QueryRequest, QueryResponse, ChatMessage } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  query(request: QueryRequest): Observable<QueryResponse> {
    return this.api.post<QueryResponse>('/query', request);
  }

  async queryStream(
    request: QueryRequest
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const url = `${environment.apiBaseUrl}/query`;
    const token = localStorage.getItem('lightrag_token') || '';
    const authHeader = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson'
      },
      body: JSON.stringify({ ...request, stream: true })
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.body.getReader();
  }

  getConversationHistory(): Array<{ role: string; content: string }> {
    try {
      const history = localStorage.getItem('lightrag_chat_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  saveToHistory(messages: ChatMessage[]): void {
    const history = messages
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
    localStorage.setItem('lightrag_chat_history', JSON.stringify(history));
  }

  clearHistory(): void {
    localStorage.removeItem('lightrag_chat_history');
  }
}
