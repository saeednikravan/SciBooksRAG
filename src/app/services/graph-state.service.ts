import { Injectable, signal, computed } from '@angular/core';
import { resolveNodeColor, DEFAULT_NODE_COLOR } from '../utils/graph-color';
import { Constants } from '../utils/constants';

export interface RawNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
  size: number;
  x: number;
  y: number;
  color: string;
  degree: number;
}

export interface RawEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  properties: Record<string, any>;
}

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  borderColor: string;
  highlighted: boolean;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  size: number;
  originalWeight: number;
  color: string;
  hidden: boolean;
}

@Injectable({ providedIn: 'root' })
export class GraphStateService {
  readonly selectedNode = signal<string | null>(null);
  readonly focusedNode = signal<string | null>(null);
  readonly selectedEdge = signal<string | null>(null);
  readonly focusedEdge = signal<string | null>(null);

  readonly rawNodes = signal<RawNode[]>([]);
  readonly rawEdges = signal<RawEdge[]>([]);
  readonly graphNodes = signal<GraphNode[]>([]);
  readonly graphEdges = signal<GraphEdge[]>([]);

  readonly isFetching = signal(false);
  readonly graphIsEmpty = signal(false);
  readonly queryLabel = signal('*');
  readonly maxQueryDepth = signal(3);
  readonly maxNodes = signal(1000);

  readonly showPropertyPanel = signal(true);
  readonly showNodeSearchBar = signal(true);
  readonly showNodeLabel = signal(true);
  readonly showEdgeLabel = signal(false);
  readonly enableNodeDrag = signal(true);
  readonly enableEdgeEvents = signal(false);
  readonly enableHideUnselectedEdges = signal(false);
  readonly minEdgeSize = signal(1);
  readonly maxEdgeSize = signal(5);

  readonly typeColorMap = signal<Map<string, string>>(new Map());

  readonly theme = signal<'light' | 'dark'>('light');

  readonly nodeMap = computed(() => {
    const map = new Map<string, RawNode>();
    for (const n of this.rawNodes()) map.set(n.id, n);
    return map;
  });

  readonly edgeMap = computed(() => {
    const map = new Map<string, RawEdge>();
    for (const e of this.rawEdges()) map.set(e.id, e);
    return map;
  });

  readonly dynamicEdgeMap = computed(() => {
    const map = new Map<string, RawEdge>();
    for (const e of this.rawEdges()) {
      const key = `${e.source}-${e.target}`;
      map.set(key, e);
    }
    return map;
  });

  setSelectedNode(nodeId: string | null) {
    this.selectedNode.set(nodeId);
  }

  setFocusedNode(nodeId: string | null) {
    this.focusedNode.set(nodeId);
  }

  setSelectedEdge(edgeId: string | null) {
    this.selectedEdge.set(edgeId);
  }

  setFocusedEdge(edgeId: string | null) {
    this.focusedEdge.set(edgeId);
  }

  clearSelection() {
    this.selectedNode.set(null);
    this.focusedNode.set(null);
    this.selectedEdge.set(null);
    this.focusedEdge.set(null);
  }

  getNode(nodeId: string): RawNode | undefined {
    return this.nodeMap().get(nodeId);
  }

  getEdge(edgeId: string): RawEdge | undefined {
    return this.edgeMap().get(edgeId);
  }

  setGraphData(rawGraph: { nodes: any[]; edges: any[] }) {
    const nodes: RawNode[] = [];
    const edges: RawEdge[] = [];
    const nodeIdMap = new Map<string, number>();

    for (let i = 0; i < rawGraph.nodes.length; i++) {
      const n = rawGraph.nodes[i];
      nodeIdMap.set(n.id, i);
      nodes.push({
        id: n.id,
        labels: n.labels || [],
        properties: n.properties || {},
        size: 10,
        x: Math.random(),
        y: Math.random(),
        color: DEFAULT_NODE_COLOR,
        degree: 0
      });
    }

    for (const e of rawGraph.edges) {
      edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        properties: e.properties || {}
      });
    }

    for (const e of edges) {
      const si = nodeIdMap.get(e.source);
      const ti = nodeIdMap.get(e.target);
      if (si !== undefined && ti !== undefined) {
        nodes[si].degree++;
        nodes[ti].degree++;
      }
    }

    let minDegree = Infinity, maxDegree = 0;
    for (const n of nodes) {
      minDegree = Math.min(minDegree, n.degree);
      maxDegree = Math.max(maxDegree, n.degree);
    }
    const range = maxDegree - minDegree;
    if (range > 0) {
      const scale = Constants.maxNodeSize - Constants.minNodeSize;
      for (const n of nodes) {
        n.size = Math.round(Constants.minNodeSize + scale * Math.pow((n.degree - minDegree) / range, 0.5));
      }
    }

    const typeColorMap = new Map<string, string>();
    for (const n of nodes) {
      const entityType = n.properties?.entity_type as string | undefined;
      const result = resolveNodeColor(entityType, typeColorMap);
      n.color = result.color;
      if (result.updated) {
        result.map.forEach((v, k) => typeColorMap.set(k, v));
      }
    }

    this.rawNodes.set(nodes);
    this.rawEdges.set(edges);
    this.typeColorMap.set(typeColorMap);

    const graphNodes: GraphNode[] = nodes.map(n => ({
      id: n.id,
      label: n.labels.join(', '),
      x: n.x,
      y: n.y,
      size: n.size,
      color: n.color,
      borderColor: Constants.nodeBorderColor,
      highlighted: false
    }));

    let minWeight = Infinity, maxWeight = 0;
    for (const e of edges) {
      const w = e.properties?.weight !== undefined ? Number(e.properties.weight) : 1;
      minWeight = Math.min(minWeight, w);
      maxWeight = Math.max(maxWeight, w);
    }

    const graphEdges: GraphEdge[] = edges.map(e => {
      const weight = e.properties?.weight !== undefined ? Number(e.properties.weight) : 1;
      let size = Constants.minEdgeSize;
      const weightRange = maxWeight - minWeight;
      if (weightRange > 0) {
        const sizeScale = this.maxEdgeSize() - this.minEdgeSize();
        size = this.minEdgeSize() + sizeScale * Math.pow((weight - minWeight) / weightRange, 0.5);
      }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.properties?.keywords || '',
        size,
        originalWeight: weight,
        color: this.theme() === 'dark' ? Constants.edgeColorDarkTheme : '#888',
        hidden: false
      };
    });

    this.graphNodes.set(graphNodes);
    this.graphEdges.set(graphEdges);
    this.graphIsEmpty.set(graphNodes.length === 0);
  }

  reset() {
    this.selectedNode.set(null);
    this.focusedNode.set(null);
    this.selectedEdge.set(null);
    this.focusedEdge.set(null);
    this.rawNodes.set([]);
    this.rawEdges.set([]);
    this.graphNodes.set([]);
    this.graphEdges.set([]);
    this.isFetching.set(false);
    this.graphIsEmpty.set(false);
  }
}
