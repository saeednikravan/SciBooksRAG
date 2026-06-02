export type QueryMode = 'naive' | 'local' | 'global' | 'hybrid' | 'mix' | 'bypass';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ReferenceItem[];
}

export interface ReferenceItem {
  reference_id: string;
  file_path: string;
  content?: string[];
}

export interface QueryRequest {
  query: string;
  mode: 'naive' | 'local' | 'global' | 'hybrid' | 'mix' | 'bypass';
  stream?: boolean;
  include_references?: boolean;
  response_type?: string;
  top_k?: number;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface QueryResponse {
  response: string;
  references?: ReferenceItem[];
}
