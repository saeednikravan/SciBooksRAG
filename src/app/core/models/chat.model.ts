export type QueryMode = 'hi' | 'bypass';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ReferenceItem[];
  graphData?: QueryDataResponse | null;
  processingInfo?: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

export interface GraphNode {
  entity_name: string;
  entity_type: string;
  description: string;
  source_id: string;
  clusters: string;
  rank: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  description: string;
  weight: number;
  rank: number;
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
  type: 'chunk' | 'references' | 'final' | 'error' | 'info';
  data?: {
    content?: string;
    references?: ReferenceItem[];
    graph_data?: QueryDataResponse;
    response?: string;
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  };
}

export interface QueryRequest {
  query: string;
  mode: QueryMode;
  only_need_context?: boolean;
  response_type?: string;
  level?: number;
  top_k?: number;
  top_m?: number;
  community_single_one?: boolean;
  include_graph?: boolean;
  max_token_for_text_unit?: number | null;
  max_token_for_local_context?: number | null;
  max_token_for_bridge_knowledge?: number | null;
  max_token_for_community_report?: number | null;
}

export interface QueryDataRequest {
  query: string;
  mode: 'hi' | 'bypass';
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
