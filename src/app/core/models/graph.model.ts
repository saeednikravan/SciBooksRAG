export interface GraphNode {
  id: string;
  label: string;
  entity_type?: string;
  description?: string;
  degree?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  description?: string;
  keywords?: string;
  weight?: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EntityCreateRequest {
  entity_name: string;
  entity_data: Record<string, any>;
}

export interface RelationCreateRequest {
  source_entity: string;
  target_entity: string;
  relation_data: Record<string, any>;
}
