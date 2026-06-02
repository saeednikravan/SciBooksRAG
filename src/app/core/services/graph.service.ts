import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { GraphNode, GraphEdge, KnowledgeGraph, EntityCreateRequest, RelationCreateRequest } from '../models/graph.model';

interface RawNode { id: string; labels: string[]; properties: Record<string, any>; }
interface RawEdge { id: string; type?: string; source: string; target: string; properties: Record<string, any>; }
interface RawGraph { nodes: RawNode[]; edges: RawEdge[]; is_truncated?: boolean; }

@Injectable({ providedIn: 'root' })
export class GraphService {
  private api = inject(ApiService);

  getLabels(): Observable<string[]> {
    return this.api.get<string[]>('/graph/label/list');
  }

  getPopularLabels(limit: number = 300): Observable<string[]> {
    return this.api.get<string[]>(`/graph/label/popular?limit=${limit}`);
  }

  searchLabels(q: string, limit: number = 50): Observable<string[]> {
    return this.api.get<string[]>(`/graph/label/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  getKnowledgeGraph(label: string, maxDepth: number = 3, maxNodes: number = 1000): Observable<KnowledgeGraph> {
    return this.api.get<RawGraph>(
      `/graphs?label=${encodeURIComponent(label)}&max_depth=${maxDepth}&max_nodes=${maxNodes}`
    ).pipe(
      map(raw => this.transformGraph(raw))
    );
  }

  private transformGraph(raw: RawGraph): KnowledgeGraph {
    const nodes: GraphNode[] = (raw.nodes || []).map(n => {
      const props = n.properties || {};
      return {
        id: n.id,
        label: n.labels?.[0] || n.id,
        entity_type: props['entity_type'] || n.labels?.[0] || 'concept',
        description: props['description'] || '',
        degree: props['degree'] || 0
      };
    });
    const edges: GraphEdge[] = (raw.edges || []).map(e => {
      const props = e.properties || {};
      return {
        source: e.source,
        target: e.target,
        description: props['description'] || e.type || '',
        keywords: e.type || props['keywords'] || '',
        weight: props['weight'] || 1
      };
    });
    return { nodes, edges };
  }

  checkEntityExists(name: string): Observable<{ exists: boolean }> {
    return this.api.get<{ exists: boolean }>(`/graph/entity/exists?name=${encodeURIComponent(name)}`);
  }

  createEntity(request: EntityCreateRequest): Observable<any> {
    return this.api.post<any>('/graph/entity/create', request);
  }

  updateEntity(entityName: string, updatedData: Record<string, any>, allowRename: boolean = false, allowMerge: boolean = false): Observable<any> {
    return this.api.post<any>('/graph/entity/edit', {
      entity_name: entityName,
      updated_data: updatedData,
      allow_rename: allowRename,
      allow_merge: allowMerge
    });
  }

  createRelation(request: RelationCreateRequest): Observable<any> {
    return this.api.post<any>('/graph/relation/create', request);
  }

  updateRelation(sourceId: string, targetId: string, updatedData: Record<string, any>): Observable<any> {
    return this.api.post<any>('/graph/relation/edit', {
      source_id: sourceId,
      target_id: targetId,
      updated_data: updatedData
    });
  }

  deleteEntityByName(entityName: string): Observable<any> {
    return this.api.delete<any>('/documents/delete_entity', { entity_name: entityName });
  }

  deleteRelationByEntities(sourceEntity: string, targetEntity: string): Observable<any> {
    return this.api.delete<any>('/documents/delete_relation', {
      source_entity: sourceEntity,
      target_entity: targetEntity
    });
  }

  mergeEntities(entities: string[], targetEntity: string): Observable<any> {
    return this.api.post<any>('/graph/entities/merge', {
      entities_to_change: entities,
      entity_to_change_into: targetEntity
    });
  }
}
