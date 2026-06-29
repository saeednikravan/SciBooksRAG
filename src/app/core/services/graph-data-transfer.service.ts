import { Injectable, signal } from '@angular/core';
import { QueryDataResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class GraphDataTransferService {
  pendingGraphData = signal<QueryDataResponse | null>(null);
}
