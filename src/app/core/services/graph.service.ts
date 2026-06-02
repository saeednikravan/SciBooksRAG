import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  KnowledgeGraph,
  EntityCreateRequest,
  RelationCreateRequest
} from '../models/graph.model';

@Injectable({ providedIn: 'root' })
export class GraphService {
  private api = inject(ApiService);

  getLabels(): Observable<string[]> {
    return this.api.get<string[]>('/graph/label/list');
  }

  getPopularLabels(limit = 300): Observable<string[]> {
    return this.api.get<string[]>(`/graph/label/popular?limit=${limit}`);
  }

  searchLabels(q: string, limit = 50): Observable<string[]> {
    return this.api.get<string[]>(`/graph/label/search?q=${q}&limit=${limit}`);
  }

  getKnowledgeGraph(
    label: string,
    maxDepth = 3,
    maxNodes = 1000
  ): Observable<KnowledgeGraph> {
    return this.api.get<KnowledgeGraph>(
      `/graphs?label=${encodeURIComponent(label)}&max_depth=${maxDepth}&max_nodes=${maxNodes}`
    );
  }

  checkEntityExists(name: string): Observable<{ exists: boolean }> {
    return this.api.get<{ exists: boolean }>(
      `/graph/entity/exists?name=${encodeURIComponent(name)}`
    );
  }

  createEntity(request: EntityCreateRequest): Observable<any> {
    return this.api.post<any>('/graph/entity/create', request);
  }

  updateEntity(
    entityName: string,
    updatedData: Record<string, any>,
    allowRename = false,
    allowMerge = false
  ): Observable<any> {
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

  updateRelation(
    sourceId: string,
    targetId: string,
    updatedData: Record<string, any>
  ): Observable<any> {
    return this.api.post<any>('/graph/relation/edit', {
      source_id: sourceId,
      target_id: targetId,
      updated_data: updatedData
    });
  }

  deleteEntity(entityName: string): Observable<any> {
    return this.api.delete<any>('/delete_entity', { entity_name: entityName });
  }

  deleteRelation(sourceEntity: string, targetEntity: string): Observable<any> {
    return this.api.delete<any>('/delete_relation', {
      source_entity: sourceEntity,
      target_entity: targetEntity
    });
  }

  mergeEntities(
    entities: string[],
    targetEntity: string
  ): Observable<any> {
    return this.api.post<any>('/graph/entities/merge', {
      entities_to_change: entities,
      entity_to_change_into: targetEntity
    });
  }
}
