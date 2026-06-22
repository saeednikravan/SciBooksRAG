import { Component, ElementRef, input, effect, viewChild, AfterViewInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { QueryDataResponse, QueryDataEntity } from '../../../core/models/chat.model';
import * as d3 from 'd3';

const COLOR_MAP: Record<string, string> = {
  person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
  concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
  book: '#8e44ad', author: '#2c3e50', publication: '#16a085',
  field: '#d35400', method: '#2980b9', default: '#95a5a6'
};

@Component({
  selector: 'app-chat-graph-viewer',
  standalone: true,
  templateUrl: './chat-graph-viewer.component.html',
  styles: [`
    :host { display: block; position: relative; }
    .graph-content {
      width: 100%;
      max-width: 1200px;
      height: 80vh;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .graph-wrapper { border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--bg-primary); overflow: hidden; position: relative; transition: all 0.3s ease; }
    .graph-wrapper.expanded {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      border-radius: 0;
      box-shadow: none;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      animation: modalIn 0.3s ease;
    }
    .graph-wrapper.expanded .graph-content {
      animation: modalIn 0.3s ease;
    }
    @keyframes modalIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .graph-header { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); position: relative; z-index: 10; }
    .graph-header h4 { font-size: 16px; font-weight: 600; margin: 0; color: var(--text-primary); }
    .graph-header span { font-size: 13px; color: var(--text-secondary); }
    .graph-body { width: 100%; height: 560px; position: relative; overflow: hidden; transition: height 0.3s ease; }
    .graph-wrapper.expanded .graph-body { flex: 1; height: auto; }
    .graph-body svg { display: block; width: 100%; height: 100%; }
    .expand-btn { width: 30px; height: 30px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; border-radius: var(--radius); flex-shrink: 0; transition: all var(--transition); }
    .expand-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .close-fullscreen-btn { margin-left: auto; width: 34px; height: 34px; border: none; background: var(--bg-tertiary); cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; border-radius: var(--radius); flex-shrink: 0; transition: all var(--transition); }
    .close-fullscreen-btn:hover { background: var(--danger-color); color: white; }
    .panel { position: absolute; top: 8px; right: 8px; z-index: 20; width: 260px; max-height: calc(100% - 16px); background: color-mix(in srgb, var(--bg-primary) 95%, transparent); backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; font-size: 12px; overflow: hidden; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
    .panel-header h3 { font-size: 12px; font-weight: 600; margin: 0; }
    .panel-body { overflow-y: auto; padding: 6px 10px 10px; flex: 1; }
    .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-color); margin-top: 8px; margin-bottom: 3px; }
    .prop-row { display: flex; align-items: flex-start; gap: 4px; padding: 2px 0; border-bottom: 1px solid var(--border-color); min-height: 20px; }
    .prop-row:last-child { border-bottom: none; }
    .prop-name { color: var(--text-secondary); font-weight: 500; flex-shrink: 0; min-width: 60px; font-size: 11px; }
    .prop-value { flex: 1; word-break: break-word; font-size: 11px; }
    .neighbors-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
    .neighbor-chip { padding: 2px 7px; border-radius: 12px; background: var(--bg-tertiary); font-size: 10px; cursor: pointer; transition: background 0.15s; color: var(--text-primary); }
    .neighbor-chip:hover { background: var(--accent-color); color: white; }
    .close-btn { width: 22px; height: 22px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; border-radius: var(--radius); flex-shrink: 0; }
    .close-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .chunk-box { background: var(--bg-tertiary); border-radius: var(--radius); padding: 6px 8px; margin-top: 4px; font-size: 11px; line-height: 1.4; max-height: 80px; overflow-y: auto; }
  `]
})
export class ChatGraphViewerComponent implements AfterViewInit, OnDestroy {
  data = input.required<QueryDataResponse>();

  graphContainer = viewChild<ElementRef<HTMLElement>>('graphContainer');

  selectedNode = signal<QueryDataEntity | null>(null);
  selectedEdge = signal<{ src_id: string; tgt_id: string; description: string; keywords: string } | null>(null);
  hoveredNode = signal<string | null>(null);
  isExpanded = signal(false);

  toggleExpand() {
    this.isExpanded.update(v => !v);
    setTimeout(() => this.renderGraph(), 100);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isExpanded()) {
      this.toggleExpand();
    }
  }

  selectedNodeNeighbors = computed(() => {
    const sel = this.selectedNode();
    if (!sel) return [];
    const d = this.data();
    return d.relationships
      .filter(e => e.src_id === sel.entity_name || e.tgt_id === sel.entity_name)
      .map(e => {
        const neighborId = e.src_id === sel.entity_name ? e.tgt_id : e.src_id;
        const neighbor = d.entities.find(n => n.entity_name === neighborId);
        return { id: neighborId, label: neighbor?.entity_name || neighborId, description: e.description };
      });
  });

  selectedNodeChunks = computed(() => {
    const sel = this.selectedNode();
    if (!sel) return [];
    const d = this.data();
    return d.chunks.filter(c => c.reference_id === sel.reference_id);
  });

  private svg: any = null;
  private mainGroup: any = null;
  private simulation: any = null;
  private ro: ResizeObserver | null = null;
  private nodeData: any[] = [];
  private edgeData: any[] = [];
  private nodeElements: any = null;
  private edgeElements: any = null;
  private zoomBehavior: any = null;

   private fitGraph(svg: any, width: number, height: number) {
      const padding = 60;
      const nodes = this.nodeData;
      if (!nodes.length) return;

      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x));
      const minY = Math.min(...nodes.map(n => n.y));
      const maxY = Math.max(...nodes.map(n => n.y));

      const graphWidth = maxX - minX || width;
      const graphHeight = maxY - minY || height;

      const scale = Math.min(
        (width - padding * 2) / graphWidth,
        (height - padding * 2) / graphHeight,
        6
      );

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const tx = width / 2 - centerX * scale;
      const ty = height / 2 - centerY * scale;

      svg.transition().duration(600).call(
        this.zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(Math.max(scale, 0.3))
      );
    }

  constructor() {
    effect(() => {
      const d = this.data();
      if (d && d.entities?.length) {
        this.selectedNode.set(null);
        setTimeout(() => this.renderGraph(), 50);
      }
    });
  }

  ngAfterViewInit() {
    this.ro = new ResizeObserver(() => {
      const el = this.graphContainer()?.nativeElement;
      if (el && el.clientWidth > 0 && el.clientHeight > 0 && this.data()?.entities?.length) {
        this.renderGraph();
      }
    });
    const el = this.graphContainer()?.nativeElement;
    if (el) this.ro.observe(el);
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
  }

  private colorFor(type: string): string {
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

  private renderGraph() {
    const el = this.graphContainer()?.nativeElement;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;

    this.destroyGraph();
    d3.select(el).selectAll('*').remove();

    const data = this.data();
    if (!data.entities?.length) return;

    const nodeMap = new Map(data.entities.map(n => [n.entity_name, n]));
    const validEdges = data.relationships.filter(e => nodeMap.has(e.src_id) && nodeMap.has(e.tgt_id));

    this.edgeData = validEdges.map(e => ({
      source: e.src_id,
      target: e.tgt_id,
      weight: e.weight || 1,
      description: e.description || ''
    }));

    const degreeMap = new Map<string, number>();
    validEdges.forEach(e => {
      degreeMap.set(e.src_id, (degreeMap.get(e.src_id) || 0) + 1);
      degreeMap.set(e.tgt_id, (degreeMap.get(e.tgt_id) || 0) + 1);
    });
    const degrees = Array.from(degreeMap.values());
    const maxDeg = Math.max(...degrees, 1);
    const nodeRadius = d3.scaleSqrt().domain([1, maxDeg]).range([12, 40]);

    const typeColorMap = new Map<string, string>();
    this.nodeData = data.entities.map(n => {
      const type = n.entity_type || 'default';
      if (!typeColorMap.has(type)) {
        typeColorMap.set(type, this.colorFor(type));
      }
      return {
        id: n.entity_name,
        label: n.entity_name,
        type,
        color: typeColorMap.get(type) || COLOR_MAP['default'],
        degree: degreeMap.get(n.entity_name) || 0,
        _radius: nodeRadius(degreeMap.get(n.entity_name) || 1),
        x: width / 2 + (Math.random() - 0.5) * width * 0.3,
        y: height / 2 + (Math.random() - 0.5) * height * 0.3
      };
    });

    const svg = d3.select(el).append('svg')
      .attr('width', width).attr('height', height)
      .style('display', 'block').style('cursor', 'grab');
    this.svg = svg;

    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'glow-chat').append('feDropShadow')
      .attr('dx', 0).attr('dy', 0).attr('stdDeviation', 8).attr('flood-color', '#f59e0b').attr('flood-opacity', 0.6);

    const g = svg.append('g').attr('class', 'main-group');
    this.mainGroup = g;

 this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
       .scaleExtent([0.05, 10])
      .on('zoom', (e: any) => {
        g.attr('transform', e.transform);
      });
    svg.call(this.zoomBehavior);

    this.edgeElements = g.append('g').selectAll('path').data(this.edgeData).enter()
      .append('path')
      .attr('stroke', '#666')
       .attr('stroke-width', (d: any) => Math.max(5, d.weight * 6))
       .attr('stroke-opacity', 0.6).attr('fill', 'none')
       .style('cursor', 'pointer')
       .on('click', (event: any, d: any) => {
         event.stopPropagation();
         const rel = data.relationships.find(r => r.src_id === (d.source.id || d.source) && r.tgt_id === (d.target.id || d.target));
         if (rel) {
           this.selectedEdge.set({ src_id: rel.src_id, tgt_id: rel.tgt_id, description: rel.description || '', keywords: rel.keywords || '' });
           this.selectedNode.set(null);
         }
         this.updateHighlights();
       })
       .on('mouseenter', (event: any, d: any) => {
         event.stopPropagation();
         d3.select(event.currentTarget).attr('stroke-opacity', 1).attr('stroke', '#f59e0b');
       })
       .on('mouseleave', (event: any, d: any) => {
         event.stopPropagation();
         d3.select(event.currentTarget).attr('stroke-opacity', 0.6).attr('stroke', '#666');
       });

    const nodeGroups = g.append('g').selectAll('g').data(this.nodeData).enter()
      .append('g').style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        const entity = data.entities.find(n => n.entity_name === d.id);
        if (entity) {
          this.selectedNode.set(entity);
          this.selectedEdge.set(null);
          this.hoveredNode.set(null);
        }
        this.updateHighlights();
      })
      .on('mouseenter', (event: any, d: any) => {
        event.stopPropagation();
        this.hoveredNode.set(d.id);
        this.updateHighlights();
      })
      .on('mouseleave', () => {
        this.hoveredNode.set(null);
        this.updateHighlights();
      })
      .call(d3.drag<any, any>()
        .on('start', (e: any, d: any) => {
          if (!e.active) this.simulation?.alphaTarget(0.15).restart();
          d.fx = d.x; d.fy = d.y;
          svg.style('cursor', 'grabbing');
        })
        .on('drag', (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e: any, d: any) => {
          if (!e.active) this.simulation?.alphaTarget(0);
          d.fx = null; d.fy = null;
          svg.style('cursor', 'grab');
        })
      );
    this.nodeElements = nodeGroups;

    nodeGroups.append('circle')
      .attr('r', (d: any) => d._radius || 12)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff').attr('stroke-width', 4)
      .style('transition', 'stroke 0.2s, stroke-width 0.2s');

    nodeGroups.append('text')
      .text((d: any) => d.label)
      .attr('x', 24).attr('y', 8).attr('font-size', '22px')
      .attr('fill', '#333').attr('font-weight', '600')
      .style('pointer-events', 'none').style('user-select', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', '#fff').style('stroke-width', '4px');

    svg.on('click', () => {
      this.selectedNode.set(null);
      this.selectedEdge.set(null);
      this.hoveredNode.set(null);
      this.updateHighlights();
    });

    const curvePath = (sx: number, sy: number, tx: number, ty: number) => {
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx = mx + (-dy / len) * 25;
      const cy = my + (dx / len) * 25;
      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

    this.simulation = d3.forceSimulation(this.nodeData)
      .force('link', d3.forceLink(this.edgeData).id((d: any) => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(d => (d as any)._radius + 20))
      .alphaDecay(0.1)
      .on('tick', () => {
        this.edgeElements.attr('d', (d: any) => curvePath(d.source.x, d.source.y, d.target.x, d.target.y));
        nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    setTimeout(() => {
      this.fitGraph(svg, width, height);
    }, 800);
  }

  private updateHighlights() {
    const selId = this.selectedNode()?.entity_name || null;
    const hoverId = this.hoveredNode();
    const activeId = hoverId || selId;

    if (!this.nodeElements || !this.edgeElements) return;

    if (!activeId) {
      this.nodeElements.selectAll('circle')
        .attr('stroke', '#fff').attr('stroke-width', 4).style('filter', null);
      this.nodeElements.style('opacity', 1);
      this.nodeElements.selectAll('text').style('display', null);
      this.edgeElements.style('opacity', 0.35).style('stroke', '#999');
      return;
    }

    const neighborIds = new Set<string>([activeId]);
    const connEdgeKeys = new Set<string>();
    this.edgeData.forEach((e: any) => {
      const key = `${e.source.id || e.source}|${e.target.id || e.target}`;
      if ((e.source.id || e.source) === activeId || (e.target.id || e.target) === activeId) {
        const other = (e.source.id || e.source) === activeId ? (e.target.id || e.target) : (e.source.id || e.source);
        neighborIds.add(other);
        connEdgeKeys.add(key);
      }
    });

    this.nodeElements.each(function (this: SVGGElement, d: any) {
      const circle = d3.select(this).select('circle');
      if (d.id === activeId) {
        circle.attr('stroke', '#f59e0b').attr('stroke-width', 5).style('filter', 'url(#glow-chat)');
      } else if (neighborIds.has(d.id)) {
        circle.attr('stroke', '#fff').attr('stroke-width', 4).style('filter', null);
      } else {
        circle.attr('stroke', '#fff').attr('stroke-width', 2).style('filter', null);
      }
    });
    this.nodeElements.style('opacity', (d: any) => neighborIds.has(d.id) ? 1 : 0.15);
    this.nodeElements.selectAll('text').style('display', (d: any) => neighborIds.has(d.id) ? null : 'none');

    const selEdge = this.selectedEdge();
    this.edgeElements.style('opacity', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      if (selEdge) {
        const selKey = `${selEdge.src_id}|${selEdge.tgt_id}`;
        const selRev = `${selEdge.tgt_id}|${selEdge.src_id}`;
        return (key === selKey || rev === selRev) ? 1 : 0.1;
      }
      return connEdgeKeys.has(key) || connEdgeKeys.has(rev) ? 0.9 : 0.15;
    }).style('stroke', (d: any) => {
      const key = `${d.source.id || d.source}|${d.target.id || d.target}`;
      const rev = `${d.target.id || d.target}|${d.source.id || d.source}`;
      if (selEdge) {
        const selKey = `${selEdge.src_id}|${selEdge.tgt_id}`;
        const selRev = `${selEdge.tgt_id}|${selEdge.src_id}`;
        return (key === selKey || rev === selRev) ? '#f59e0b' : '#666';
      }
      return connEdgeKeys.has(key) || connEdgeKeys.has(rev) ? '#f59e0b' : '#666';
    });
  }

  navigateToNode(entityName: string) {
    const entity = this.data().entities.find(n => n.entity_name === entityName);
    if (entity) {
      this.selectedNode.set(entity);
      this.selectedEdge.set(null);
      this.hoveredNode.set(null);
      this.updateHighlights();
    }
  }

  clearEdgeSelection() {
    this.selectedEdge.set(null);
    this.updateHighlights();
  }

  clearSelection() {
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.hoveredNode.set(null);
    this.updateHighlights();
  }
}
