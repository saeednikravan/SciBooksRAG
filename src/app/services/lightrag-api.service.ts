import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LightragNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface LightragEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface LightragGraph {
  nodes: LightragNode[];
  edges: LightragEdge[];
}

@Injectable({ providedIn: 'root' })
export class LightragApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  queryGraphs(label: string, maxDepth: number, maxNodes: number): Observable<LightragGraph> {
    return this.http.get<LightragGraph>(
      `${this.baseUrl}/graphs?label=${encodeURIComponent(label)}&max_depth=${maxDepth}&max_nodes=${maxNodes}`
    );
  }

  getGraphLabels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/graph/label/list`);
  }

  getPopularLabels(limit: number = 300): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/graph/label/popular?limit=${limit}`);
  }

  searchLabels(query: string, limit: number = 50): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/graph/label/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  updateEntity(entityName: string, updatedData: Record<string, any>, allowRename = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/graph/entity/edit`, {
      entity_name: entityName,
      updated_data: updatedData,
      allow_rename: allowRename
    });
  }

  updateRelation(sourceEntity: string, targetEntity: string, updatedData: Record<string, any>): Observable<any> {
    return this.http.post(`${this.baseUrl}/graph/relation/edit`, {
      source_id: sourceEntity,
      target_id: targetEntity,
      updated_data: updatedData
    });
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
}
