import { Component, ElementRef, AfterViewInit, OnDestroy, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HeaderComponent } from '../../layout/header/header.component';
import { GraphPropertiesPanelComponent } from './graph-properties-panel.component';
import { GraphToolbarComponent } from './graph-toolbar.component';
import { GraphService } from '../../core/services/graph.service';
import { GraphDataTransferService } from '../../core/services/graph-data-transfer.service';
import { GraphNode, GraphEdge, KnowledgeGraph } from '../../core/models/graph.model';
import { QueryDataResponse } from '../../core/models/chat.model';
import * as d3 from 'd3';

const ENTITY_TYPES = ['person', 'organization', 'location', 'concept', 'event', 'object', 'book', 'author', 'publication', 'field', 'method'];
const COLOR_MAP: Record<string, string> = {
  person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
  concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
  book: '#8e44ad', author: '#2c3e50', publication: '#16a085',
  field: '#d35400', method: '#2980b9', default: '#95a5a6'
};

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [FormsModule, HeaderComponent, GraphPropertiesPanelComponent, GraphToolbarComponent],
  templateUrl: './graph.component.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .graph-page { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .graph-content { flex: 1; position: relative; overflow: hidden; min-height: 0; }
    .graph-container { position: absolute; inset: 0; }
    .empty-graph-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-secondary); z-index: 5; }
    .empty-graph-state .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-muted); }
    .empty-graph-state .empty-icon svg { width: 100%; height: 100%; }
    .empty-graph-state h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 4px; }
    .empty-graph-state p { font-size: 13px; }
    .controls-top-left { position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; flex-direction: column; gap: 6px; }
    .search-bar { width: 240px; position: relative; }
    .search-bar .input { padding-left: 30px; }
    .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 14px; height: 14px; pointer-events: none; }
    .label-picker { width: 240px; display: flex; flex-direction: column; gap: 8px; }
    .label-picker label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .label-input-row { position: relative; }
    .suggestions { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius); max-height: 180px; overflow-y: auto; z-index: 20; }
    .suggestion-item { padding: 6px 10px; font-size: 12px; cursor: pointer; }
    .suggestion-item:hover { background: var(--bg-tertiary); }
    .legend { position: absolute; bottom: 80px; left: 12px; right: auto; z-index: 10; padding: 10px; max-height: 60%; overflow-y: auto; min-width: 120px; }
    .legend-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legend-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; border-radius: 3px; }
    .legend-item:hover { background: var(--bg-tertiary); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-text { font-size: 11px; text-transform: capitalize; }
 
    .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--bg-primary) 80%, transparent); z-index: 100; }
    .spinner-container { text-align: center; }
    .spinner-container p { margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
    .error-banner { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; padding: 16px 24px; text-align: center; background: #fde8e8; border-radius: var(--radius-lg); max-width: 360px; }
    .error-banner h4 { color: #c0392b; font-size: 14px; margin-bottom: 4px; }
    .error-banner p { color: #c0392b; font-size: 12px; margin-bottom: 8px; }
    :host-context([data-theme="dark"]) .error-banner { background: rgba(231,76,60,0.15); }
    :host-context([data-theme="dark"]) .error-banner h4,
    :host-context([data-theme="dark"]) .error-banner p { color: #f87171; }
    .loading-spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .edit-prop-input { width: 100%; }
   
  `]
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  private graphService = inject(GraphService);
  private graphTransfer = inject(GraphDataTransferService);

  @ViewChild('graphContainer', { static: true }) graphContainerRef!: ElementRef<HTMLElement>;

  entityTypes = ENTITY_TYPES;
  graphData = signal<KnowledgeGraph>({ nodes: [], edges: [] });
  chatGraphData = signal<QueryDataResponse | null>(null);
  isChatGraph = signal(false);
  availableEntityTypes = signal<string[]>([]);
  entityColorMap = signal<Map<string, string>>(new Map());
  selectedEntityType = signal('');
  selectedNode = signal<GraphNode | null>(null);
  selectedEdge = signal<GraphEdge | null>(null);
  panelWidth = signal<number>(21);
  highlightNodeIds = signal<Set<string>>(new Set());
  connectedEdges = signal<Set<string>>(new Set());
  hoverNodeIds = signal<Set<string>>(new Set());
  hoverEdges = signal<Set<string>>(new Set());
 
  graphLoading = signal(false);
  graphError = signal('');
  showEmpty = signal(false);
  layoutType = signal('circular');
  zoomLevel = signal(0.8);
  showLegendFlag = signal(true);
  searchQuery = signal('');
  nodeDragFree = signal(true);
  hoveredNode = signal<GraphNode | null>(null);

  activeNode = computed(() => this.hoveredNode() || this.selectedNode());

  debugFlag = signal(false);
  debugSize = signal('');

 

  private svg: any = null;
  private mainGroup: any = null;
  private simulation: any = null;
  private ro: ResizeObserver | null = null;
  private nodeData: any[] = [];
  private edgeData: any[] = [];
  private nodeElements: any = null;
  private edgeElements: any = null;
  private edgeLabelElements: any = null;
  private zoomBehavior: any = null;

  filteredNodes = computed(() => {
    const data = this.graphData();
    const q = this.searchQuery().toLowerCase();
    const type = this.selectedEntityType();
    let nodes = data.nodes;
    if (type) {
      nodes = nodes.filter(n => (n.entity_type || '').toLowerCase() === type.toLowerCase());
    }
    if (q) {
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
      );
    }
    return nodes;
  });

  selectedNodeNeighbors = computed(() => {
    const sel = this.selectedNode();
    if (!sel) return [];
    const data = this.graphData();
    return data.edges
      .filter(e => e.source === sel.id || e.target === sel.id)
      .map(e => {
        const neighborId = e.source === sel.id ? e.target : e.source;
        const neighbor = data.nodes.find(n => n.id === neighborId);
        return { id: neighborId, label: neighbor?.label || '' };
      });
  });

  constructor() {
    effect(() => {
      const data = this.graphData();
      const filtered = this.filteredNodes();
      if (filtered.length || data.edges.length) {
        this.showEmpty.set(false);
      } else if (!this.graphLoading()) {
        this.showEmpty.set(true);
        this.destroyGraph();
      }
    });

    effect(() => {
      const sel = this.selectedNode();
      if (!sel) {
        this.highlightNodeIds.set(new Set());
        this.connectedEdges.set(new Set());
        return;
      }
      const data = this.graphData();
      const neighborIds = new Set<string>([sel.id]);
      const connEdges = new Set<string>();
      data.edges.forEach(e => {
        const key = `${e.source}|${e.target}`;
        if (e.source === sel.id) { neighborIds.add(e.target); connEdges.add(key); }
        if (e.target === sel.id) { neighborIds.add(e.source); connEdges.add(key); }
      });
      this.highlightNodeIds.set(neighborIds);
      this.connectedEdges.set(connEdges);
    });

    effect(() => {
      const hover = this.hoveredNode();
      if (!hover) {
        this.hoverNodeIds.set(new Set());
        this.hoverEdges.set(new Set());
        return;
      }
      const data = this.graphData();
      const neighborIds = new Set<string>([hover.id]);
      const connEdges = new Set<string>();
      data.edges.forEach(e => {
        const key = `${e.source}|${e.target}`;
        if (e.source === hover.id) { neighborIds.add(e.target); connEdges.add(key); }
        if (e.target === hover.id) { neighborIds.add(e.source); connEdges.add(key); }
      });
      this.hoverNodeIds.set(neighborIds);
      this.hoverEdges.set(connEdges);
    });
  }

  ngAfterViewInit() {
    this.ro = new ResizeObserver(() => {
      const el = this.graphContainerRef?.nativeElement;
      if (el) {
        this.debugSize.set(`${el.clientWidth}×${el.clientHeight}`);
        if (el.clientWidth > 0 && el.clientHeight > 0 && this.graphData().nodes.length > 0) {
          this.renderGraph();
        }
      }
    });
    this.ro.observe(this.graphContainerRef.nativeElement);

    const pendingData = this.graphTransfer.pendingGraphData();
    if (pendingData && pendingData.entities?.length) {
      this.loadChatGraph(pendingData);
      this.graphTransfer.pendingGraphData.set(null);
    }
  }

  ngOnDestroy() {
    this.destroyGraph();
    this.ro?.disconnect();
  }

  private destroyGraph() {
    if (this.simulation) { this.simulation.stop(); this.simulation = null; }
    this.svg = null;
    this.mainGroup = null;
    this.nodeElements = null;
    this.edgeElements = null;
    this.edgeLabelElements = null;
  }

  colorFor(type: string): string {
    return COLOR_MAP[type?.toLowerCase()] || COLOR_MAP['default'];
  }

  private chatColorFor(type: string): string {
    if (type && type.toLowerCase() in COLOR_MAP) return COLOR_MAP[type.toLowerCase()];
    const hash = this.hashString(type);
    const hue = (hash * 137.508) % 360;
    return `hsl(${hue}, 75%, 48%)`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

 loadSampleData() {
    this.graphLoading.set(false);
    this.graphError.set('');
    this.graphData.set({
      nodes: [
        { id: 'n1', label: 'Entity A', entity_type: 'concept', description: 'Test A' },
        { id: 'n2', label: 'Entity B', entity_type: 'person', description: 'Test B' },
        { id: 'n3', label: 'Entity C', entity_type: 'organization', description: 'Test C' },
        { id: 'n4', label: 'Entity D', entity_type: 'event', description: 'Test D' },
      ],
      edges: [
        { source: 'n1', target: 'n2', keywords: 'relates_to', description: 'Edge AB' },
        { source: 'n2', target: 'n3', keywords: 'depends_on', description: 'Edge BC' },
        { source: 'n3', target: 'n4', keywords: 'leads_to', description: 'Edge CD' },
        { source: 'n1', target: 'n4', keywords: 'connects', description: 'Edge AD' },
      ]
    });
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    setTimeout(() => this.renderGraph(), 100);
  }

  onEntityTypeChange(type: string) {
    this.selectedEntityType.set(type);
    setTimeout(() => this.renderGraph(), 0);
  }

  loadChatGraph(chatData: QueryDataResponse) {
    this.graphLoading.set(true);
    this.graphError.set('');
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.showEmpty.set(false);
    this.isChatGraph.set(true);
    this.chatGraphData.set(chatData);

    const nodeMap = new Map<string, GraphNode>();
    const typeSet = new Set<string>();
    chatData.entities.forEach(e => {
      nodeMap.set(e.entity_name, {
        id: e.entity_name,
        label: e.entity_name,
        entity_type: e.entity_type || 'concept',
        description: e.description || ''
      });
      if (e.entity_type) typeSet.add(e.entity_type);
    });

    const edges: GraphEdge[] = chatData.relationships.map(r => ({
      source: r.src_id,
      target: r.tgt_id,
      keywords: r.keywords || '',
      description: r.description || '',
      weight: r.weight || 1
    }));

    this.graphData.set({
      nodes: Array.from(nodeMap.values()),
      edges
    });

    const colorMap = new Map<string, string>();
    typeSet.forEach((type) => {
      colorMap.set(type.toLowerCase(), this.chatColorFor(type));
    });
    this.availableEntityTypes.set(Array.from(typeSet).sort());
    this.entityColorMap.set(colorMap);
    this.selectedEntityType.set('');

    this.graphLoading.set(false);
    setTimeout(() => this.renderGraph(), 100);
  }

  private renderGraph() {
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;

    this.destroyGraph();
    d3.select(el).selectAll('*').remove();

    const fullData = this.graphData();
    const filtered = this.filteredNodes();
    const filteredIds = new Set(filtered.map(n => n.id));
    const data: KnowledgeGraph = {
      nodes: filteredIds.size > 0 ? fullData.nodes.filter(n => filteredIds.has(n.id)) : fullData.nodes,
      edges: filteredIds.size > 0
        ? fullData.edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target))
        : fullData.edges
    };
    if (!data.nodes?.length) return;

    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const validEdges = data.edges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));

    this.edgeData = validEdges.map(e => ({
      source: e.source, target: e.target,
      keywords: e.keywords || '',
      description: e.description || '',
      weight: e.weight || 1,
      sourceNode: nodeMap.get(e.source),
      targetNode: nodeMap.get(e.target)
    }));

    const degreeMap = new Map<string, number>();
    validEdges.forEach(e => {
      degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
    });
    const degrees = Array.from(degreeMap.values());
    const maxDeg = Math.max(...degrees, 1);
    const nodeRadius = d3.scaleSqrt().domain([1, maxDeg]).range(this.isChatGraph() ? [24, 55] : [20, 80]);
    const collisionRadius = d3.scaleSqrt().domain([1, maxDeg]).range(this.isChatGraph() ? [44, 75] : [28, 100]);

    const isolatedNodes = data.nodes.filter(n => degreeMap.get(n.id) === 0);
    const connectedNodes = data.nodes.filter(n => (degreeMap.get(n.id) || 0) > 0);

    const positions: { id: string; x: number; y: number }[] = [];

    connectedNodes.forEach(n => {
      positions.push({
        id: n.id,
        x: width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.3,
        y: height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.3
      });
    });

    const isoCount = isolatedNodes.length;
    if (isoCount > 0) {
      const cols = Math.ceil(Math.sqrt(isoCount * (width / height)));
      const rows = Math.ceil(isoCount / cols);
      const cellW = Math.min(width, height) * 0.15 / Math.max(cols, 1);
      const cellH = Math.min(width, height) * 0.15 / Math.max(rows, 1);
      const cx = width / 2;
      const cy = height / 2;
      const startX = cx - ((cols - 1) * cellW) / 2;
      const startY = cy - ((rows - 1) * cellH) / 2;

      isolatedNodes.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          id: n.id,
          x: startX + col * cellW + (Math.random() - 0.5) * cellW * 0.5,
          y: startY + row * cellH + (Math.random() - 0.5) * cellH * 0.5
        });
      });
    }

    const posMap = new Map(positions.map(p => [p.id, p]));
    this.nodeData = data.nodes.map(n => {
      const p = posMap.get(n.id) || { x: width / 2, y: height / 2 };
      return {
        ...n,
        degree: degreeMap.get(n.id) || 0,
        _radius: nodeRadius(degreeMap.get(n.id) || 1),
        x: p.x,
        y: p.y
      };
    });

    const svg = d3.select(el).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block')
      .style('cursor', 'grab');
    this.svg = svg;

    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'glow').append('feDropShadow')
      .attr('dx', 0).attr('dy', 0).attr('stdDeviation', 5).attr('flood-color', 'var(--accent-color)').attr('flood-opacity', 0.5);
    if (this.isChatGraph()) {
      defs.append('filter').attr('id', 'glow-chat').append('feDropShadow')
        .attr('dx', 0).attr('dy', 0).attr('stdDeviation', 8).attr('flood-color', '#f59e0b').attr('flood-opacity', 0.6);
    }

    const g = svg.append('g').attr('class', 'main-group');
    this.mainGroup = g;

    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(this.isChatGraph() ? [0.05, 10] : [0.1, 8])
      .on('zoom', (e: any) => {
        g.attr('transform', e.transform);
        this.zoomLevel.set(e.transform.k);
      });
    svg.call(this.zoomBehavior);
    svg.call(this.zoomBehavior.transform, d3.zoomIdentity.scale(0.8));

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    const linkElements = g.append('g').attr('class', 'edges')
      .selectAll('path').data(this.edgeData).enter()
      .append('path')
      .attr('stroke', this.isChatGraph() ? (isDarkMode ? '#d0d0d0' : '#555') : '#999')
      .attr('stroke-width', (d: any) => this.isChatGraph() ? Math.max(3, (d.weight || 1) * 3.5) : Math.max(2, (d.weight || 1) * 3))
      .attr('stroke-opacity', this.isChatGraph() ? 0.85 : 0.4)
      .attr('fill', 'none')
      .style('transition', 'stroke-opacity 0.2s')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.selectEdge(d.source.id || d.source, d.target.id || d.target);
      })
      .on('mouseenter', (event: any, d: any) => {
        event.stopPropagation();
        d3.select(event.currentTarget).attr('stroke-opacity', 0.9).attr('stroke', '#f59e0b');
      })
      .on('mouseleave', (event: any, d: any) => {
        event.stopPropagation();
        const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
        const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
        const isActive = this.selectedEdge() && (
          `${this.selectedEdge()!.source}|${this.selectedEdge()!.target}` === key ||
          `${this.selectedEdge()!.target}|${this.selectedEdge()!.source}` === key
        );
        d3.select(event.currentTarget).attr('stroke-opacity', isActive ? 0.9 : 0.4).attr('stroke', isActive ? '#f59e0b' : '#999');
      });
    this.edgeElements = linkElements;

    const edgeLabels = g.append('g').attr('class', 'edge-labels')
      .selectAll('text').data(this.edgeData.filter((e: any) => e.keywords)).enter()
      .append('text')
      .text((d: any) => d.keywords)
      .attr('font-size', '11px').attr('fill', '#888').attr('text-anchor', 'middle')
      .style('pointer-events', 'none').style('user-select', 'none')
      .style('display', 'none');
    this.edgeLabelElements = edgeLabels;

    const nodeGroups = g.append('g').attr('class', 'nodes')
      .selectAll('g').data(this.nodeData).enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.selectNode(d as GraphNode);
      })
      .on('dblclick', (event: any, d: any) => {
        event.stopPropagation();
        this.selectNode(d as GraphNode);
      })
      .on('mouseenter', (event: any, d: any) => {
        event.stopPropagation();
        this.hoveredNode.set(d as GraphNode);
        setTimeout(() => this.updateHighlights(), 0);
      })
      .on('mouseleave', (event: any, d: any) => {
        event.stopPropagation();
        this.hoveredNode.set(null);
        setTimeout(() => this.updateHighlights(), 0);
      })
      .call(d3.drag<any, any>()
        .on('start', (e: any, d: any) => {
          if (!e.active) this.simulation?.alpha(0.15).restart();
          d.fx = d.x; d.fy = d.y;
          svg.style('cursor', 'grabbing');
        })
        .on('drag', (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e: any, d: any) => {
          if (this.nodeDragFree()) {
            d.fx = d.x; d.fy = d.y;
            setTimeout(() => {
              d.fx = null; d.fy = null;
            }, 500);
          } else {
            if (!e.active) this.simulation?.alphaTarget(0);
            d.fx = null; d.fy = null;
          }
          svg.style('cursor', 'grab');
        })
      );
    this.nodeElements = nodeGroups;

    nodeGroups.append('circle')
      .attr('r', (d: any) => d._radius || 8)
      .attr('fill', (d: any) => this.chatColorFor(d.entity_type || 'concept'))
      .attr('stroke', '#fff').attr('stroke-width', this.isChatGraph() ? 4 : 2)
      .style('transition', 'stroke 0.2s, stroke-width 0.2s');

    nodeGroups.append('rect')
      .attr('class', 'node-label-bg')
      .attr('x', 10).attr('y', -8)
      .attr('rx', 3).attr('ry', 3)
      .attr('fill', 'transparent').attr('stroke', 'transparent').attr('stroke-width', 1);

    nodeGroups.append('text')
      .text((d: any) => d.label)
      .attr('x', this.isChatGraph() ? ((d: any) => d._radius + 8) : 14)
      .attr('y', 4)
      .attr('font-size', this.isChatGraph() ? '16px' : '14px')
      .attr('fill', this.isChatGraph() ? 'var(--text-primary)' : '#333')
      .attr('font-weight', this.isChatGraph() ? '600' : '500')
      .style('pointer-events', 'none').style('user-select', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', this.isChatGraph() ? 'var(--bg-primary)' : '#fff')
      .style('stroke-width', this.isChatGraph() ? '3px' : '2px');

    nodeGroups.append('title')
      .text((d: any) => `${d.label}${d.description ? ': ' + d.description : ''}`);

    svg.on('click', () => this.clearSelection());

    const curvePath = (sx: number, sy: number, tx: number, ty: number) => {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = this.isChatGraph() ? 25 : 30;
      const cx = mx + (-dy / len) * offset;
      const cy = my + (dx / len) * offset;
      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

this.simulation = d3.forceSimulation(this.nodeData)
      .force('link', d3.forceLink(this.edgeData).id((d: any) => d.id).distance(this.isChatGraph() ? 200 : 400))
      .force('charge', d3.forceManyBody().strength(this.isChatGraph() ? -300 : -600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => this.isChatGraph() ? ((d as any)._radius + 20) : collisionRadius((d as any).degree || 0)))
      .alphaDecay(this.isChatGraph() ? 0.1 : 0.08)
      .on('tick', () => {
        linkElements.attr('d', (d: any) =>
          curvePath(d.source.x, d.source.y, d.target.x, d.target.y)
        );
        edgeLabels
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
        nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    const padding = 120;
    const nodes = this.nodeData;
    if (nodes.length) {
      const maxRadius = Math.max(...nodes.map(n => n._radius || 8));
      const minX = Math.min(...nodes.map(n => n.x)) - maxRadius;
      const maxX = Math.max(...nodes.map(n => n.x)) + maxRadius;
      const minY = Math.min(...nodes.map(n => n.y)) - maxRadius;
      const maxY = Math.max(...nodes.map(n => n.y)) + maxRadius;
      const graphWidth = maxX - minX || width;
      const graphHeight = maxY - minY || height;
      const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 0.8);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const tx = width / 2 - centerX * scale;
      const ty = height / 2 - centerY * scale;
      svg.transition().duration(600).call(
        this.zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(Math.max(scale, 0.1))
      );
      this.zoomLevel.set(scale);
    }

    if (this.layoutType() !== 'force') {
      setTimeout(() => this.changeLayout(this.layoutType()), 500);
    }
  }

  private updateHighlights() {
    const selId = this.selectedNode()?.id;
    const hoverId = this.hoveredNode()?.id;
    if (!this.nodeElements || !this.edgeElements) return;

    const activeId = hoverId || selId;
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
 const isChat = this.isChatGraph();
    const defaultStrokeWidth = isChat ? 4 : 3;
    const activeStrokeWidth = isChat ? 5 : 4;
    const neighborStrokeWidth = isChat ? 4 : 3;
    const inactiveStrokeWidth = isChat ? 2 : 1;
    const defaultEdgeColor = isChat ? (isDarkMode ? '#d0d0d0' : '#555') : '#999';
    const connEdgeColor = '#f59e0b';
    const glowFilter = isChat ? 'url(#glow-chat)' : 'url(#glow)';

  if (!activeId) {
      this.nodeElements.selectAll('circle')
  .attr('stroke', '#fff').attr('stroke-width', defaultStrokeWidth)
        .style('filter', null);
      this.nodeElements.selectAll('.node-label-bg').attr('fill', 'transparent').attr('stroke', 'transparent');
      this.nodeElements.style('opacity', 1);
      this.nodeElements.selectAll('text').style('display', null);
      this.edgeElements.style('opacity', (d: any) => isChat ? 0.85 : Math.max(0.3, (d.weight || 1) * 0.4));
      return;
    }

    const neighborIds = hoverId ? this.hoverNodeIds() : this.highlightNodeIds();
    const connEdges = hoverId ? this.hoverEdges() : this.connectedEdges();

    const nodeEls = this.nodeElements;
    nodeEls.each(function(this: SVGGElement, d: any) {
      const circle = d3.select(this).select('circle');
      const bg = d3.select(this).select('.node-label-bg');
      if (d.id === activeId) {
        circle.attr('stroke', '#f59e0b').attr('stroke-width', activeStrokeWidth).style('filter', glowFilter);
        const textEl = d3.select(this).select('text').node() as SVGTextElement | null;
        const bbox = textEl?.getBBox() ?? { x: 10, y: -8, width: 40, height: 16 };
        bg.attr('fill', '#fef3c7').attr('stroke', '#f59e0b').attr('stroke-width', 1)
          .attr('x', bbox.x - 2)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 4)
          .attr('height', bbox.height + 4);
      } else if (neighborIds.has(d.id)) {
        circle.attr('stroke', '#fff').attr('stroke-width', neighborStrokeWidth).style('filter', null);
        bg.attr('fill', 'transparent').attr('stroke', 'transparent');
      } else {
        circle.attr('stroke', '#fff').attr('stroke-width', inactiveStrokeWidth).style('filter', null);
        bg.attr('fill', 'transparent').attr('stroke', 'transparent');
      }
    });
    this.nodeElements.style('opacity', (d: any) => neighborIds.has(d.id) ? 1 : (isChat ? 0.15 : 0.15));
    this.nodeElements.selectAll('text').style('display', (d: any) => neighborIds.has(d.id) ? null : 'none');

    const selEdge = this.selectedEdge();
    this.edgeElements.style('opacity', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      if (selEdge) {
        const selKey = `${selEdge.source}|${selEdge.target}`;
        const selRev = `${selEdge.target}|${selEdge.source}`;
        return (key === selKey || rev === selRev) ? 1 : (isChat ? 0.1 : 0.04);
      }
      return connEdges.has(key) || connEdges.has(rev) ? (isChat ? 0.9 : 0.7) : (isChat ? 0.15 : 0.04);
    }).style('stroke', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      if (selEdge) {
        const selKey = `${selEdge.source}|${selEdge.target}`;
        const selRev = `${selEdge.target}|${selEdge.source}`;
        return (key === selKey || rev === selRev) ? '#f59e0b' : defaultEdgeColor;
      }
      return connEdges.has(key) || connEdges.has(rev) ? connEdgeColor : defaultEdgeColor;
    }).attr('stroke-width', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      if (selEdge) {
        const selKey = `${selEdge.source}|${selEdge.target}`;
        const selRev = `${selEdge.target}|${selEdge.source}`;
        if (key === selKey || rev === selRev) {
          return isChat ? Math.max(6, (d.weight || 1) * 7) : Math.max(4, (d.weight || 1) * 5);
        }
        return isChat ? Math.max(3, (d.weight || 1) * 3.5) : Math.max(2, (d.weight || 1) * 3);
      }
      return isChat ? Math.max(3, (d.weight || 1) * 3.5) : Math.max(2, (d.weight || 1) * 3);
    });
  }

  selectNode(node: GraphNode) {
    this.selectedNode.set(node);
    this.selectedEdge.set(null);
    setTimeout(() => this.updateHighlights(), 0);
  }

  selectEdge(sourceId: string, targetId: string) {
    const edge = this.graphData().edges.find(e => e.source === sourceId && e.target === targetId);
    if (edge) {
      this.selectedEdge.set(edge);
      this.selectedNode.set(null);
    }
  }

  clearSelection() {
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    setTimeout(() => this.updateHighlights(), 0);
  }

   navigateToNode(nodeId: string) {
    const node = this.graphData().nodes.find(n => n.id === nodeId);
    if (node) {
      this.selectNode(node);
    }
  }

reheatSimulation() {
    if (!this.simulation) return;
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;

    const maxDeg = Math.max(...this.nodeData.map(d => d.degree || 0), 1);
    const collideRadius = d3.scaleSqrt().domain([1, maxDeg]).range([20, 80]);
    this.simulation
      .force('link', d3.forceLink(this.edgeData).id((d: any) => d.id).distance(400))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => collideRadius((d as any).degree || 0)));
    this.simulation.alpha(0.3).restart();
  }

  onNodeDragToggle(ev: Event) {
    this.nodeDragFree.set((ev.target as HTMLInputElement).checked);
  }

  changeLayout(layout: string) {
    this.layoutType.set(layout);
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height || !this.simulation) return;

    if (layout === 'force') {
      const maxDeg = Math.max(...this.nodeData.map(d => d.degree || 0), 1);
      const collideRadius = d3.scaleSqrt().domain([1, maxDeg]).range([20, 80]);
      this.simulation
.force('link', d3.forceLink(this.edgeData).id((d: any) => d.id).distance(400))
     .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(d => collideRadius((d as any).degree || 0)))
        .alpha(0.3).restart();
    } else if (layout === 'grid') {
      this.simulation.stop();
      const cols = Math.ceil(Math.sqrt(this.nodeData.length));
      this.nodeData.forEach((d, i) => {
        d.x = 100 + (i % cols) * 160;
        d.y = 100 + Math.floor(i / cols) * 160;
        d.fx = d.x; d.fy = d.y;
      });
      setTimeout(() => {
        this.nodeData.forEach(d => { d.fx = null; d.fy = null; });
        this.simulation.alpha(0.3).restart();
      }, 500);
      this.simulation.alpha(0).tick();
    } else if (layout === 'radial') {
      this.simulation.stop();
      const centerX = width / 2, centerY = height / 2;
      const sorted = [...this.nodeData].sort((a, b) => (b.degree || 0) - (a.degree || 0));
      sorted.forEach((d, i) => {
        const ring = Math.floor(i / 8) + 1;
        const angle = (i % 8) * (Math.PI * 2 / Math.min(8, sorted.length));
        d.x = centerX + ring * 140 * Math.cos(angle);
        d.y = centerY + ring * 140 * Math.sin(angle);
        d.fx = d.x; d.fy = d.y;
      });
      setTimeout(() => {
        this.nodeData.forEach(d => { d.fx = null; d.fy = null; });
        this.simulation.alpha(0.3).restart();
      }, 500);
      this.simulation.alpha(0).tick();
    } else if (layout === 'circular') {
      this.simulation.stop();
      const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.35;
      this.nodeData.forEach((d, i) => {
        const angle = (i / this.nodeData.length) * Math.PI * 2 - Math.PI / 2;
        d.x = cx + r * Math.cos(angle);
        d.y = cy + r * Math.sin(angle);
        d.fx = d.x; d.fy = d.y;
      });
      setTimeout(() => {
        this.nodeData.forEach(d => { d.fx = null; d.fy = null; });
        this.simulation.alpha(0.3).restart();
      }, 500);
      this.simulation.alpha(0).tick();
    }
  }

  zoomIn() {
    if (!this.svg || !this.zoomBehavior) return;
    this.svg.transition().duration(200).call(this.zoomBehavior.scaleBy, 1.3);
  }

  zoomOut() {
    if (!this.svg || !this.zoomBehavior) return;
    this.svg.transition().duration(200).call(this.zoomBehavior.scaleBy, 0.7);
  }

  zoomReset() {
    if (!this.svg || !this.zoomBehavior) return;
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;
    const initialScale = Math.min(1, 800 / Math.max(el.clientWidth, el.clientHeight));
    const offsetX = (el.clientWidth - el.clientWidth * initialScale) / 2;
    const offsetY = (el.clientHeight - el.clientHeight * initialScale) / 2;
    this.svg.transition().duration(300)
      .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(initialScale));
  }

  toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  toggleLegend() {
    this.showLegendFlag.update(v => !v);
  }

  openEditProperty(ev: { type: 'node' | 'edge'; field: string; value: any; nodeId?: string; edgeSource?: string; edgeTarget?: string }) {
    console.log('Edit property:', ev);
  }

 
}
