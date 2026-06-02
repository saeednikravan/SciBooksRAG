import { Component, ElementRef, AfterViewInit, OnDestroy, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header.component';
import { GraphService } from '../../core/services/graph.service';
import { KnowledgeGraph } from '../../core/models/graph.model';
import * as d3 from 'd3';

const ENTITY_TYPES = ['person', 'organization', 'location', 'concept', 'event', 'object', 'book', 'author', 'publication', 'field', 'method'];
const COLOR_MAP: Record<string, string> = {
  person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
  concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
  book: '#8e44ad', author: '#2c3e50', publication: '#16a085',
  field: '#d35400', method: '#2980b9', default: '#95a5a6'
};

interface ModalState {
  type: 'createEntity' | 'editEntity' | 'deleteEntity' | 'createRelation' | 'deleteRelation' | 'mergeEntities' | '';
  visible: boolean;
  error?: string;
  result?: any;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [FormsModule, HeaderComponent, JsonPipe],
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
    .controls-top-left { position: absolute; top: 12px; left: 12px; z-index: 10; }
    .label-picker { padding: 12px; width: 260px; display: flex; flex-direction: column; gap: 8px; }
    .label-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .label-input-row { position: relative; }
    .label-input { width: 100%; }
    .suggestions { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius); max-height: 180px; overflow-y: auto; z-index: 20; }
    .suggestion-item { padding: 6px 10px; font-size: 12px; cursor: pointer; }
    .suggestion-item:hover { background: var(--bg-tertiary); }
    .label-select { width: 100%; }
    .legend { position: absolute; top: 12px; right: 12px; z-index: 10; padding: 10px; max-height: 60%; overflow-y: auto; min-width: 130px; }
    .legend-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legend-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-text { font-size: 11px; text-transform: capitalize; }
    .fab-panel { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; gap: 6px; padding: 8px 12px; flex-wrap: wrap; justify-content: center; }
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
  `]
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  private graphService = inject(GraphService);

  @ViewChild('graphContainer', { static: true }) graphContainerRef!: ElementRef<HTMLElement>;

  entityTypes = ENTITY_TYPES;
  graphData = signal<KnowledgeGraph>({ nodes: [], edges: [] });
  selectedLabel = signal('');
  labelQuery = '';
  popularLabels = signal<string[]>([]);
  labelSuggestions = signal<string[]>([]);
  labelsLoading = signal(false);
  graphLoading = signal(false);
  graphError = signal('');
  showEmpty = signal(false);

  modal = signal<ModalState>({ type: '', visible: false });
  modalLoading = signal(false);

  debug = signal(true);
  debugSize = signal('');

  formEntityName = ''; formEntityType = 'concept'; formEntityDesc = '';
  formRelSource = ''; formRelTarget = ''; formRelLabel = ''; formRelDesc = '';
  formDeleteEntity = '';
  formDelRelSource = ''; formDelRelTarget = '';
  formMergeSources = ''; formMergeTarget = '';

  private svg: any = null;
  private simulation: any = null;
  private ro: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.graphData();
      if (data.nodes.length || data.edges.length) {
        this.showEmpty.set(false);
        setTimeout(() => this.renderGraph(), 50);
      } else if (!this.graphLoading()) {
        this.showEmpty.set(true);
        this.destroyGraph();
      }
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

  loadGraph() {
    this.graphLoading.set(true);
    this.graphError.set('');
    this.graphService.getKnowledgeGraph(this.selectedLabel() || '', 3, 1000).subscribe({
      next: (data) => {
        this.graphLoading.set(false);
        this.graphData.set(data);
      },
      error: (err) => {
        this.graphLoading.set(false);
        this.graphData.set({ nodes: [], edges: [] });
        this.graphError.set(err.error?.detail || err.message || 'Failed to load graph');
      }
    });
  }

  private renderGraph() {
    const el = this.graphContainerRef?.nativeElement;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    this.debugSize.set(`render: ${width}×${height}`);
    if (!width || !height) return;

    this.destroyGraph();
    d3.select(el).selectAll('*').remove();

    const data = this.graphData();
    if (!data.nodes?.length) return;

    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const validEdges = data.edges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));

    const svg = d3.select(el).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block');
    this.svg = svg;

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 8])
      .on('zoom', (e: any) => g.attr('transform', e.transform));
    svg.call(zoom);

    svg.append('defs').append('marker')
      .attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10').attr('refX', 13).attr('refY', 0)
      .attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6)
      .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5').attr('fill', '#999');

    const d3Nodes = data.nodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.3,
      y: height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.3
    }));
    const d3Links = validEdges.map(e => ({
      source: e.source,
      target: e.target,
      label: e.keywords || e.description || ''
    }));

    const linkElements = g.append('g').selectAll('line').data(d3Links).enter().append('line')
      .attr('stroke', '#999').attr('stroke-width', 1.5).attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrowhead)');

    const nodeGroups = g.append('g').selectAll('g').data(d3Nodes).enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', (e: any, d: any) => {
          if (!e.active) this.simulation?.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e: any, d: any) => {
          if (!e.active) this.simulation?.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    nodeGroups.append('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => this.colorFor(d.entity_type || d.label))
      .attr('stroke', '#fff').attr('stroke-width', 2).attr('cursor', 'pointer');

    nodeGroups.append('text')
      .text((d: any) => d.label)
      .attr('x', 12).attr('y', 4).attr('font-size', '11px')
      .attr('fill', '#333').attr('font-weight', '500')
      .style('pointer-events', 'none').style('user-select', 'none');

    nodeGroups.append('title')
      .text((d: any) => `${d.label}${d.description ? ': ' + d.description : ''}`);

    this.simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))
      .on('tick', () => {
        linkElements
          .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
        nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
  }

  modalTitle = computed(() => {
    const t: Record<string, string> = {
      createEntity: 'Create Entity', editEntity: 'Edit Entity', deleteEntity: 'Delete Entity',
      createRelation: 'Create Relation', deleteRelation: 'Delete Relation', mergeEntities: 'Merge Entities'
    };
    return t[this.modal().type] || '';
  });

  openModal(type: ModalState['type']) {
    this.modal.set({ type, visible: true });
    this.formEntityName = ''; this.formEntityType = 'concept'; this.formEntityDesc = '';
    this.formRelSource = ''; this.formRelTarget = ''; this.formRelLabel = ''; this.formRelDesc = '';
    this.formDeleteEntity = ''; this.formDelRelSource = ''; this.formDelRelTarget = '';
    this.formMergeSources = ''; this.formMergeTarget = '';
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
      default: return;
    }

    obs.subscribe({
      next: (res: any) => {
        this.modalLoading.set(false);
        this.modal.update(m => ({ ...m, result: res }));
        this.loadGraph();
        this.loadPopularLabels();
      },
      error: (err: any) => {
        this.modalLoading.set(false);
        this.modal.update(m => ({ ...m, error: err.error?.detail || err.message || 'Request failed' }));
      }
    });
  }
}
