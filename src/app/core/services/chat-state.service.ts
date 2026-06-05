import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  messageCount = signal(0);
}
