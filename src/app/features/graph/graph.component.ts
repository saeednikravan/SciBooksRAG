import { Component, ElementRef, AfterViewInit, OnDestroy, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header.component';
import { GraphPropertiesPanelComponent } from './graph-properties-panel.component';
import { GraphToolbarComponent } from './graph-toolbar.component';
import { GraphService } from '../../core/services/graph.service';
import { GraphNode, GraphEdge, KnowledgeGraph } from '../../core/models/graph.model';
import * as d3 from 'd3';

const ENTITY_TYPES = ['person', 'organization', 'location', 'concept', 'event', 'object', 'book', 'author', 'publication', 'field', 'method'];
const COLOR_MAP: Record<string, string> = {
  person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
  concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
  book: '#8e44ad', author: '#2c3e50', publication: '#16a085',
  field: '#d35400', method: '#2980b9', default: '#95a5a6'
};

interface ModalState {
  type: 'createEntity' | 'editEntity' | 'deleteEntity' | 'createRelation' | 'deleteRelation' | 'mergeEntities' | 'editProperty' | '';
  visible: boolean;
  error?: string;
  result?: any;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [FormsModule, HeaderComponent, JsonPipe, GraphPropertiesPanelComponent, GraphToolbarComponent],
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
    .legend { position: absolute; top: 12px; right: 12px; z-index: 10; padding: 10px; max-height: 60%; overflow-y: auto; min-width: 120px; }
    .legend-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legend-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; border-radius: 3px; }
    .legend-item:hover { background: var(--bg-tertiary); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-text { font-size: 11px; text-transform: capitalize; }
    .fab-panel { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; gap: 6px; padding: 8px 12px; flex-wrap: wrap; justify-content: center; }
    .fab-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); width: 100%; text-align: center; margin-bottom: 2px; }
    .fab-btn { font-size: 12px; padding: 5px 10px; }
    .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--bg-primary) 80%, transparent); z-index: 100; }
    .spinner-container { text-align: center; }
    .spinner-container p { margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
    .error-banner { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; padding: 16px 24px; text-align: center; background: #fde8e8; border-radius: var(--radius-lg); max-width: 360px; }
    .error-banner h4 { color: #c0392b; font-size: 14px; margin-bottom: 4px; }
    .error-banner p { color: #c0392b; font-size: 12px; margin-bottom: 8px; }
    :host-context([data-theme="dark"]) .error-banner { background: rgba(231,76,60,0.15); }
    :host-context([data-theme="dark"]) .error-banner h4,
    :host-context([data-theme="dark"]) .error-banner p { color: #f87171; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { width: 420px; max-height: 80vh; overflow-y: auto; padding: 0; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
    .modal-header h3 { font-size: 15px; font-weight: 600; }
    .modal-body { padding: 16px 20px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; }
    .form-group .input { width: 100%; }
    .form-textarea { min-height: 60px; resize: vertical; font-family: inherit; }
    .result-box { border-radius: var(--radius); padding: 10px; margin-top: 8px; max-height: 160px; overflow-y: auto; }
    .error-box { background: #fde8e8; }
    .success-box { background: var(--bg-tertiary); }
    .result-box pre { font-size: 11px; white-space: pre-wrap; word-break: break-all; margin: 0; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border-color); }
    .loading-spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .edit-prop-input { width: 100%; }
    .filter-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; background: var(--accent-color); color: white; font-size: 11px; cursor: pointer; }
    .filter-bar { position: absolute; top: 80px; left: 12px; z-index: 10; display: flex; align-items: center; gap: 6px; }
    .filter-bar .filter-chip { padding: 2px 10px; border-radius: 12px; font-size: 11px; border: 1px solid var(--border-color); cursor: pointer; background: var(--bg-secondary); color: var(--text-secondary); transition: all 0.15s; }
    .filter-bar .filter-chip.active { background: var(--accent-color); color: white; border-color: var(--accent-color); }
    .filter-bar .filter-chip:hover:not(.active) { border-color: var(--accent-color); }
    .mode-selector { position: absolute; top: 200px; left: 12px; z-index: 10; width: 240px; }
    .mode-selector select { width: 100%; }
  `]
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  private graphService = inject(GraphService);

  @ViewChild('graphContainer', { static: true }) graphContainerRef!: ElementRef<HTMLElement>;

  entityTypes = ENTITY_TYPES;
  graphData = signal<KnowledgeGraph>({ nodes: [], edges: [] });
  selectedNode = signal<GraphNode | null>(null);
  selectedEdge = signal<GraphEdge | null>(null);
  highlightNodeIds = signal<Set<string>>(new Set());
  connectedEdges = signal<Set<string>>(new Set());
  hoverNodeIds = signal<Set<string>>(new Set());
  hoverEdges = signal<Set<string>>(new Set());
  selectedLabel = signal('');
  labelQuery = '';
  popularLabels = signal<string[]>([]);
  labelSuggestions = signal<string[]>([]);
  labelsLoading = signal(false);
  graphLoading = signal(false);
  graphError = signal('');
  showEmpty = signal(false);
  layoutType = signal('force');
  zoomLevel = signal(1);
  showLegendFlag = signal(true);
  searchQuery = signal('');
  nodeDragFree = signal(true);
  hoveredNode = signal<GraphNode | null>(null);

  activeNode = computed(() => this.hoveredNode() || this.selectedNode());

  modal = signal<ModalState>({ type: '', visible: false });
  modalLoading = signal(false);

  debugFlag = signal(false);
  debugSize = signal('');

  formEntityName = ''; formEntityType = 'concept'; formEntityDesc = '';
  formRelSource = ''; formRelTarget = ''; formRelLabel = ''; formRelDesc = '';
  formDeleteEntity = '';
  formDelRelSource = ''; formDelRelTarget = '';
  formMergeSources = ''; formMergeTarget = '';
  formPropField = ''; formPropValue = '';

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
    if (!q) return data.nodes;
    return data.nodes.filter(n =>
      n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    );
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
      if (data.nodes.length || data.edges.length) {
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
    this.loadPopularLabels();
    this.loadGraph();
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

  loadPopularLabels() {
    this.graphService.getPopularLabels().subscribe({
      next: (l) => this.popularLabels.set(l),
      error: () => {}
    });
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

  searchLabels() {
    clearTimeout(this.searchTimeout);
    const q = this.labelQuery.trim();
    if (!q) { this.labelSuggestions.set([]); return; }
    this.searchTimeout = setTimeout(() => {
      this.graphService.searchLabels(q).subscribe({
        next: (l) => this.labelSuggestions.set(l),
        error: () => this.labelSuggestions.set([])
      });
    }, 250);
  }
  searchTimeout: any;

  selectLabel(label: string) {
    this.selectedLabel.set(label);
    this.labelQuery = '';
    this.labelSuggestions.set([]);
    this.loadGraph();
  }

  clearLabel() {
    this.selectedLabel.set('');
    this.loadGraph();
  }

  loadGraph() {
    this.graphLoading.set(true);
    this.graphError.set('');
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.showEmpty.set(false);
    const label = this.selectedLabel() || '*';
    this.graphService.getKnowledgeGraph(label, 3, 1000).subscribe({
      next: (data) => {
        this.graphLoading.set(false);
        this.graphData.set(data);
        setTimeout(() => this.renderGraph(), 100);
      },
      error: (err) => {
        this.graphLoading.set(false);
        this.graphData.set({ nodes: [], edges: [] });
        this.graphError.set(err.error?.detail || err.message || 'Failed to load graph');
        this.showEmpty.set(true);
      }
    });
  }

  private renderGraph() {
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;

    this.destroyGraph();
    d3.select(el).selectAll('*').remove();

    const data = this.graphData();
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
    const nodeRadius = d3.scaleSqrt().domain([1, maxDeg]).range([20, 80]);
    const collisionRadius = d3.scaleSqrt().domain([1, maxDeg]).range([28, 100]);

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

    const g = svg.append('g').attr('class', 'main-group');
    this.mainGroup = g;

    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (e: any) => {
        g.attr('transform', e.transform);
        this.zoomLevel.set(e.transform.k);
      });
    svg.call(this.zoomBehavior);

    const linkElements = g.append('g').attr('class', 'edges')
      .selectAll('path').data(this.edgeData).enter()
      .append('path')
      .attr('stroke', '#999').attr('stroke-width', (d: any) => Math.max(2, (d.weight || 1) * 3))
      .attr('stroke-opacity', 0.4).attr('fill', 'none')
      .style('transition', 'stroke-opacity 0.2s');
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
        this.expandNode(d.id);
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
      .attr('fill', (d: any) => this.colorFor(d.entity_type || d.label))
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .style('transition', 'stroke 0.2s, stroke-width 0.2s');

    nodeGroups.append('rect')
      .attr('class', 'node-label-bg')
      .attr('x', 10).attr('y', -8)
      .attr('rx', 3).attr('ry', 3)
      .attr('fill', 'transparent').attr('stroke', 'transparent').attr('stroke-width', 1);

    nodeGroups.append('text')
      .text((d: any) => d.label)
      .attr('x', 14).attr('y', 4).attr('font-size', '14px')
      .attr('fill', '#333').attr('font-weight', '500')
      .style('pointer-events', 'none').style('user-select', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', '#fff').style('stroke-width', '2px');

    nodeGroups.append('title')
      .text((d: any) => `${d.label}${d.description ? ': ' + d.description : ''}`);

    svg.on('click', () => this.clearSelection());

    const curvePath = (sx: number, sy: number, tx: number, ty: number) => {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = 30;
      const cx = mx + (-dy / len) * offset;
      const cy = my + (dx / len) * offset;
      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

this.simulation = d3.forceSimulation(this.nodeData)
      .force('link', d3.forceLink(this.edgeData).id((d: any) => d.id).distance(400))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => collisionRadius((d as any).degree || 0)))
      .alphaDecay(0.08)
      .on('tick', () => {
        linkElements.attr('d', (d: any) =>
          curvePath(d.source.x, d.source.y, d.target.x, d.target.y)
        );
        edgeLabels
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
        nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    const initialScale = Math.min(1, 800 / Math.max(width, height));
    const offsetX = (width - width * initialScale) / 2;
    const offsetY = (height - height * initialScale) / 2;
    svg.call(this.zoomBehavior.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(initialScale));
    this.zoomLevel.set(initialScale);
  }

  private updateHighlights() {
    const selId = this.selectedNode()?.id;
    const hoverId = this.hoveredNode()?.id;
    if (!this.nodeElements || !this.edgeElements) return;

    const activeId = hoverId || selId;
  if (!activeId) {
      this.nodeElements.selectAll('circle')
 .attr('stroke', '#fff').attr('stroke-width', 3)
        .style('filter', null);
      this.nodeElements.selectAll('.node-label-bg').attr('fill', 'transparent').attr('stroke', 'transparent');
      this.nodeElements.style('opacity', 1);
      this.nodeElements.selectAll('text').style('display', null);
      this.edgeElements.style('opacity', (d: any) => Math.max(0.3, (d.weight || 1) * 0.4));
      return;
    }

    const neighborIds = hoverId ? this.hoverNodeIds() : this.highlightNodeIds();
    const connEdges = hoverId ? this.hoverEdges() : this.connectedEdges();

    const nodeEls = this.nodeElements;
    nodeEls.each(function(this: SVGGElement, d: any) {
      const circle = d3.select(this).select('circle');
      const bg = d3.select(this).select('.node-label-bg');
      if (d.id === activeId) {
        circle.attr('stroke', '#f59e0b').attr('stroke-width', 4).style('filter', 'url(#glow)');
        const textEl = d3.select(this).select('text').node() as SVGTextElement | null;
        const bbox = textEl?.getBBox() ?? { x: 10, y: -8, width: 40, height: 16 };
        bg.attr('fill', '#fef3c7').attr('stroke', '#f59e0b').attr('stroke-width', 1)
          .attr('x', bbox.x - 2)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 4)
          .attr('height', bbox.height + 4);
      } else if (neighborIds.has(d.id)) {
        circle.attr('stroke', '#fff').attr('stroke-width', 3).style('filter', null);
        bg.attr('fill', 'transparent').attr('stroke', 'transparent');
      } else {
        circle.attr('stroke', '#fff').attr('stroke-width', 1).style('filter', null);
        bg.attr('fill', 'transparent').attr('stroke', 'transparent');
      }
    });
    this.nodeElements.style('opacity', (d: any) => neighborIds.has(d.id) ? 1 : 0.15);
    this.nodeElements.selectAll('text').style('display', (d: any) => neighborIds.has(d.id) ? null : 'none');

    this.edgeElements.style('opacity', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      return connEdges.has(key) || connEdges.has(rev) ? 0.7 : 0.04;
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

  expandNode(nodeId: string) {
    const node = this.graphData().nodes.find(n => n.id === nodeId);
    if (!node) return;
    const label = node.entity_type || node.label;
    this.graphLoading.set(true);
    this.graphService.getKnowledgeGraph(label, 2, 200).subscribe({
      next: (data) => {
        this.graphLoading.set(false);
        const current = this.graphData();
        const existingIds = new Set(current.nodes.map(n => n.id));
        const existingEdgeKeys = new Set(current.edges.map(e => `${e.source}|${e.target}`));
        const newNodes = data.nodes.filter(n => !existingIds.has(n.id));
        const newEdges = data.edges.filter(e => !existingEdgeKeys.has(`${e.source}|${e.target}`));
        this.graphData.set({
          nodes: [...current.nodes, ...newNodes],
          edges: [...current.edges, ...newEdges]
        });
      },
      error: () => this.graphLoading.set(false)
    });
  }

  pruneNode(nodeId: string) {
    const current = this.graphData();
    const neighborIds = new Set<string>();
    current.edges.forEach(e => {
      if (e.source === nodeId) neighborIds.add(e.target);
      if (e.target === nodeId) neighborIds.add(e.source);
    });
    const nodesToRemove = new Set([nodeId]);
    neighborIds.forEach(nid => {
      const hasOtherEdge = current.edges.some(e =>
        (e.source === nid && e.target !== nodeId) ||
        (e.target === nid && e.source !== nodeId)
      );
      if (!hasOtherEdge) nodesToRemove.add(nid);
    });
    this.graphData.set({
      nodes: current.nodes.filter(n => !nodesToRemove.has(n.id)),
      edges: current.edges.filter(e => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target))
    });
    this.selectedNode.set(null);
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

  modalTitle = computed(() => {
    const t: Record<string, string> = {
      createEntity: 'Create Entity', editEntity: 'Edit Entity', deleteEntity: 'Delete Entity',
      createRelation: 'Create Relation', deleteRelation: 'Delete Relation',
      mergeEntities: 'Merge Entities', editProperty: 'Edit Property'
    };
    return t[this.modal().type] || '';
  });

  openModal(type: ModalState['type']) {
    this.modal.set({ type, visible: true });
    this.formEntityName = ''; this.formEntityType = 'concept'; this.formEntityDesc = '';
    this.formRelSource = ''; this.formRelTarget = ''; this.formRelLabel = ''; this.formRelDesc = '';
    this.formDeleteEntity = ''; this.formDelRelSource = ''; this.formDelRelTarget = '';
    this.formMergeSources = ''; this.formMergeTarget = '';
    this.formPropField = ''; this.formPropValue = '';
  }

  openEditProperty(ev: { type: 'node' | 'edge'; field: string; value: any; nodeId?: string; edgeSource?: string; edgeTarget?: string }) {
    this.modal.set({ type: 'editProperty', visible: true });
    this.formPropField = ev.field;
    this.formPropValue = ev.value || '';
    this.formEntityName = ev.nodeId || '';
    this.formRelSource = ev.edgeSource || '';
    this.formRelTarget = ev.edgeTarget || '';
  }

  closeModal() { this.modal.set({ type: '', visible: false }); }

  executeModal() {
    this.modalLoading.set(true);
    const m = this.modal();
    let obs;

    switch (m.type) {
      case 'createEntity':
        obs = this.graphService.createEntity({ entity_name: this.formEntityName, entity_data: { type: this.formEntityType, description: this.formEntityDesc } });
        break;
      case 'editEntity':
        obs = this.graphService.updateEntity(this.formEntityName, { type: this.formEntityType, description: this.formEntityDesc });
        break;
      case 'deleteEntity':
        obs = this.graphService.deleteEntityByName(this.formDeleteEntity);
        break;
      case 'deleteRelation':
        obs = this.graphService.deleteRelationByEntities(this.formDelRelSource, this.formDelRelTarget);
        break;
      case 'createRelation':
        obs = this.graphService.createRelation({ source_entity: this.formRelSource, target_entity: this.formRelTarget, relation_data: { keywords: this.formRelLabel, description: this.formRelDesc } });
        break;
      case 'mergeEntities':
        const sources = this.formMergeSources.split(',').map(s => s.trim());
        obs = this.graphService.mergeEntities(sources, this.formMergeTarget);
        break;
      case 'editProperty':
        if (this.formPropField === 'entity_type' || this.formPropField === 'description') {
          if (this.formEntityName) {
            obs = this.graphService.updateEntity(this.formEntityName, { [this.formPropField]: this.formPropValue });
          } else if (this.formRelSource && this.formRelTarget) {
            obs = this.graphService.updateRelation(this.formRelSource, this.formRelTarget, { [this.formPropField]: this.formPropValue });
          }
        }
        break;
      default: return;
    }

    if (!obs) { this.modalLoading.set(false); return; }

    obs.subscribe({
      next: (res: any) => {
        this.modalLoading.set(false);
        this.modal.update(m => ({ ...m, result: res }));
        setTimeout(() => this.loadGraph(), 500);
      },
      error: (err: any) => {
        this.modalLoading.set(false);
        this.modal.update(m => ({ ...m, error: err.error?.detail || err.message || 'Request failed' }));
      }
    });
  }
}
