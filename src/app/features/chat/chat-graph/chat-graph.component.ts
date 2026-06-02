import { Component, ElementRef, input, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../../core/models/graph.model';

interface GNode extends d3.SimulationNodeDatum { id: string; label: string; entity_type?: string; }
interface GLink extends d3.SimulationLinkDatum<GNode> { weight?: number; }

const ENTITY_COLORS: Record<string, string> = {
  person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
  concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
  time: '#f39c12', place: '#cf6d17', role: '#2ecc71',
  condition: '#e74c3c', treatment: '#3498db', cause: '#e67e22',
  default: '#94a3b8'
};

@Component({
  selector: 'app-chat-graph',
  standalone: true,
  template: `
    <div class="chat-graph-wrapper" #wrapper>
      <div class="graph-head">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/>
          <circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/>
          <line x1="12" y1="9" x2="12" y2="5"/><line x1="14.5" y1="13.5" x2="17" y2="17"/><line x1="9.5" y1="13.5" x2="7" y2="17"/>
        </svg>
        <span>Knowledge Graph</span>
        <span class="graph-stat">{{ data().nodes.length }} nodes · {{ data().edges.length }} edges</span>
      </div>
      <div class="graph-legend">
        @for (e of legendEntries(); track e.type) {
          <span class="legend-item"><span class="legend-dot" [style.background]="e.color"></span>{{ e.type }}</span>
        }
      </div>
      <div class="graph-canvas" #canvas></div>
    </div>
  `,
  styles: [`
    .chat-graph-wrapper { margin-top: 12px; border-top: 1px solid rgba(0,0,0,0.08); padding-top: 10px; }
    .graph-head { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#64748b; margin-bottom:8px; }
    .graph-stat { font-weight:400; color:#94a3b8; margin-left:auto; font-size:11px; }
    .graph-legend { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
    .legend-item { display:flex; align-items:center; gap:4px; font-size:10px; color:#64748b; }
    .legend-dot { width:8px; height:8px; border-radius:50%; }
    .graph-canvas { width:100%; height:240px; border-radius:10px; background:#f8fafc; border:1px solid #e2e8f0; overflow:hidden; }
  `]
})
export class ChatGraphComponent implements AfterViewInit, OnDestroy {
  data = input.required<KnowledgeGraph>();

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  private simulation: d3.Simulation<GNode, GLink> | null = null;

  legendEntries = () => {
    const types = [...new Set(this.data().nodes.map(n => n.entity_type || 'default').filter(Boolean))];
    return types.map(t => ({ type: t, color: ENTITY_COLORS[t] || ENTITY_COLORS['default'] }));
  };

  ngAfterViewInit(): void {
    setTimeout(() => this.render(), 50);
  }

  ngOnDestroy(): void { this.simulation?.stop(); }

  private render(): void {
    if (!this.canvasRef?.nativeElement) return;
    const el = this.canvasRef.nativeElement;
    const width = el.clientWidth || 400;
    const height = 240;
    const cx = width / 2, cy = height / 2;

    d3.select(el).selectAll('*').remove();
    const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const nodes: GNode[] = this.data().nodes.map(n => ({
      id: n.id, label: n.label || n.id,
      entity_type: n.entity_type,
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 30
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links: GLink[] = this.data().edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({ source: e.source, target: e.target, weight: e.weight || 1 }));

    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#cbd5e1').attr('stroke-width', d => Math.max(1, Math.min(3, (d.weight || 1) * 1.2))).attr('stroke-opacity', 0.5);
    const ng = g.append('g').selectAll('g').data(nodes).join('g').style('cursor', 'pointer');

    ng.append('circle').attr('r', 8).attr('fill', d => ENTITY_COLORS[d.entity_type || 'default'] || ENTITY_COLORS['default']).attr('stroke', '#fff').attr('stroke-width', 1.5);
    ng.append('text').text(d => d.label.length > 12 ? d.label.substring(0, 11) + '…' : d.label)
      .attr('dx', 0).attr('dy', 20).attr('text-anchor', 'middle').attr('font-size', '9px').attr('fill', '#475569').attr('font-family', 'inherit');

    ng.on('mouseenter', function (event, d) {
      d3.select(this).select('circle').attr('stroke', '#22c55e').attr('stroke-width', 2.5);
      link.attr('stroke', l => {
        const l2 = l as any;
        return (l2.source.id === d.id || l2.target.id === d.id) ? '#22c55e' : '#cbd5e1';
      }).attr('stroke-opacity', l => {
        const l2 = l as any;
        return (l2.source.id === d.id || l2.target.id === d.id) ? 1 : 0.3;
      });
    }).on('mouseleave', function () {
      d3.select(this).select('circle').attr('stroke', '#fff').attr('stroke-width', 1.5);
      link.attr('stroke', '#cbd5e1').attr('stroke-opacity', 0.5);
    });

    const drag = d3.drag<SVGGElement, GNode>()
      .on('start', (e, d) => { if (!e.active) this.simulation?.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) this.simulation?.alphaTarget(0); d.fx = null; d.fy = null; });
    ng.call(drag as any);

    this.simulation?.stop();
    this.simulation = d3.forceSimulation<GNode>(nodes)
      .force('link', d3.forceLink<GNode, GLink>(links).id(d => d.id).distance(70))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(cx, cy))
      .force('collision', d3.forceCollide().radius(25))
      .alphaDecay(0.03);

    this.simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      ng.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
  }
}
