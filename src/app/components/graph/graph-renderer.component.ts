import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  effect, NgZone, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { GraphStateService, GraphNode, GraphEdge } from '../../services/graph-state.service';
import { Constants } from '../../utils/constants';

@Component({
  selector: 'app-graph-renderer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #canvasContainer class="graph-container">
      <canvas #graphCanvas></canvas>
    </div>
  `,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class GraphRendererComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private simulation!: d3.Simulation<GraphNode, GraphEdge>;
  private transform = d3.zoomIdentity;
  private animationFrame = 0;
  private resizeObserver!: ResizeObserver;
  private draggedNode: GraphNode | null = null;

  constructor(
    private graphState: GraphStateService,
    private ngZone: NgZone
  ) {
    effect(() => {
      const nodes = this.graphState.graphNodes();
      const edges = this.graphState.graphEdges();
      if (this.canvas && nodes.length > 0) {
        this.initSimulation(nodes, edges);
      }
    });

    effect(() => {
      const sel = this.graphState.selectedNode();
      const foc = this.graphState.focusedNode();
      this.render();
    });
  }

  ngAfterViewInit() {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.setupZoom();
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    if (this.simulation) this.simulation.stop();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    cancelAnimationFrame(this.animationFrame);
  }

  private resizeCanvas() {
    const container = this.containerRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = container.clientWidth * dpr;
    this.canvas.height = container.clientHeight * dpr;
    this.canvas.style.width = container.clientWidth + 'px';
    this.canvas.style.height = container.clientHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.render();
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private setupZoom() {
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.05, 10])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this.render();
      });

    const selection = d3.select(this.canvas);
    selection.call(zoom);

    // Drag behavior
    selection.call(
      d3.drag<HTMLCanvasElement, unknown>()
        .container(this.canvas)
        .subject((event) => {
          const [mx, my] = d3.pointer(event, this.canvas);
          const x = (mx - this.transform.x) / this.transform.k;
          const y = (my - this.transform.y) / this.transform.k;
          const nodes = this.graphState.graphNodes();
          for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = n.x - x;
            const dy = n.y - y;
            if (dx * dx + dy * dy < (n.size * n.size + 200) / (this.transform.k * this.transform.k)) {
              return n;
            }
          }
          return null;
        })
        .on('start', (event) => {
          if (!event.active && this.simulation) this.simulation.alphaTarget(0.1).restart();
          this.draggedNode = event.subject;
          if (this.draggedNode) {
            this.draggedNode.fx = this.draggedNode.x;
            this.draggedNode.fy = this.draggedNode.y;
            this.graphState.setSelectedNode(this.draggedNode.id);
          }
        })
        .on('drag', (event) => {
          if (this.draggedNode) {
            const [mx, my] = d3.pointer(event, this.canvas);
            this.draggedNode.fx = (mx - this.transform.x) / this.transform.k;
            this.draggedNode.fy = (my - this.transform.y) / this.transform.k;
          }
        })
        .on('end', (event) => {
          if (!event.active && this.simulation) this.simulation.alphaTarget(0);
          if (this.draggedNode && this.graphState.enableNodeDrag()) {
            this.draggedNode.fx = null;
            this.draggedNode.fy = null;
          }
          this.draggedNode = null;
        })
    );

    // Click on background to clear selection
    selection.on('click', (event) => {
      if (event.target === this.canvas) {
        this.graphState.clearSelection();
      }
    });
  }

  private initSimulation(nodes: GraphNode[], edges: GraphEdge[]) {
    if (this.simulation) this.simulation.stop();

    this.simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id(d => d.id)
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(
        this.canvas.clientWidth / 2,
        this.canvas.clientHeight / 2
      ))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => d.size + 2))
      .on('tick', () => this.render());

    // Run simulation for a few iterations then cool down
    this.simulation.alpha(0.5).restart();
  }

  runLayout() {
    if (this.simulation) {
      this.simulation.alpha(0.8).restart();
    }
  }

  zoomIn() {
    const canvas = this.canvas;
    d3.select(canvas).transition().duration(200).call(
      d3.zoom<HTMLCanvasElement, unknown>().scaleBy as any, 1.5
    );
  }

  zoomOut() {
    const canvas = this.canvas;
    d3.select(canvas).transition().duration(200).call(
      d3.zoom<HTMLCanvasElement, unknown>().scaleBy as any, 1 / 1.5
    );
  }

  resetZoom() {
    const canvas = this.canvas;
    d3.select(canvas).transition().duration(500).call(
      d3.zoom<HTMLCanvasElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  }

  focusOnNode(nodeId: string) {
    const nodes = this.graphState.graphNodes();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const canvas = this.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const newTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(2)
      .translate(-node.x, -node.y);

    d3.select(canvas).transition().duration(500).call(
      d3.zoom<HTMLCanvasElement, unknown>().transform as any,
      newTransform
    );
  }

  private render() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.k, this.transform.k);

    const nodes = this.graphState.graphNodes();
    const edges = this.graphState.graphEdges();
    const selectedNode = this.graphState.selectedNode();
    const focusedNode = this.graphState.focusedNode();
    const showLabels = this.graphState.showNodeLabel();
    const showEdgeLabels = this.graphState.showEdgeLabel();
    const hideUnselected = this.graphState.enableHideUnselectedEdges();
    const highlightNode = focusedNode || selectedNode;

    // Draw edges
    for (const edge of edges) {
      const source = typeof edge.source === 'string'
        ? nodes.find(n => n.id === edge.source)
        : edge.source as GraphNode;
      const target = typeof edge.target === 'string'
        ? nodes.find(n => n.id === edge.target)
        : edge.target as GraphNode;

      if (!source || !target) continue;

      let edgeColor = edge.color;
      let edgeHidden = edge.hidden;

      if (highlightNode) {
        const isConnected = source.id === highlightNode || target.id === highlightNode;
        if (hideUnselected && !isConnected) {
          edgeHidden = true;
        } else if (isConnected) {
          edgeColor = Constants.edgeColorHighlightedLightTheme;
        }
      }

      if (edgeHidden) continue;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = Math.max(0.5, edge.size * 0.5);
      ctx.globalAlpha = highlightNode ? (source.id === highlightNode || target.id === highlightNode ? 1 : 0.2) : 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (showEdgeLabels && edge.label) {
        const mx = (source.x + target.x) / 2;
        const my = (source.y + target.y) / 2;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, mx, my - 3);
      }
    }

    // Draw nodes
    for (const node of nodes) {
      let nodeColor = node.color;
      let borderColor = node.borderColor;
      let alpha = 1;

      if (highlightNode) {
        if (node.id === highlightNode) {
          borderColor = Constants.nodeBorderColorSelected;
        } else {
          // Check if connected
          const isConnected = edges.some(e => {
            const s = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
            const t = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
            return (s === highlightNode && t === node.id) || (t === highlightNode && s === node.id);
          });
          if (isConnected) {
            alpha = 1;
          } else {
            nodeColor = Constants.nodeColorDisabled;
            alpha = 0.4;
          }
        }
      }

      ctx.globalAlpha = alpha;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      if (showLabels && node.label) {
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.size + 14);
      }

      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
