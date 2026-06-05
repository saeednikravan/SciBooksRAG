export type QueryMode = 'naive' | 'local' | 'global' | 'hybrid' | 'mix' | 'bypass';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ReferenceItem[];
  graphData?: QueryDataResponse | null;
  processingInfo?: string;
}

export interface QueryDataEntity {
  entity_name: string;
  entity_type: string;
  description: string;
  source_id?: string;
  file_path: string;
  created_at?: string;
  reference_id: string;
}

export interface QueryDataRelationship {
  src_id: string;
  tgt_id: string;
  description: string;
  keywords?: string;
  weight: number;
  source_id: string;
  file_path: string;
  created_at?: string;
  reference_id: string;
}

export interface QueryDataChunk {
  content: string;
  file_path: string;
  chunk_id: string;
  reference_id: string;
}

export interface QueryDataReference {
  reference_id: string;
  file_path: string;
}

export interface QueryDataResponse {
  entities: QueryDataEntity[];
  relationships: QueryDataRelationship[];
  chunks: QueryDataChunk[];
  references: QueryDataReference[];
}

export interface ReferenceItem {
  reference_id: string;
  file_path: string;
  content?: string[];
}

export interface StreamChunk {
  type: 'chunk' | 'references' | 'done' | 'error' | 'info';
  data?: {
    content?: string;
    references?: ReferenceItem[];
    graph_data?: QueryDataResponse;
  };
}

export interface QueryRequest {
  query: string;
  mode: 'naive' | 'local' | 'global' | 'hybrid' | 'mix' | 'bypass';
  include_references?: boolean;
  response_type?: string;
  top_k?: number;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface QueryDataRequest {
  query: string;
  mode: 'naive' | 'local' | 'global' | 'hybrid' | 'mix' | 'bypass';
  top_k?: number;
  chunk_top_k?: number;
  max_entity_tokens?: number;
  max_relation_tokens?: number;
  max_total_tokens?: number;
  conversation_history?: Array<{ role: string; content: string }>;
  history_turns?: number;
}

export interface QueryResponse {
  response: string;
  references?: ReferenceItem[];
}
