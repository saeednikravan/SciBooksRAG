import { Component, input, output } from '@angular/core';
import { GraphNode, GraphEdge } from '../../core/models/graph.model';

@Component({
  selector: 'app-graph-properties-panel',
  standalone: true,
  imports: [],
  templateUrl: './graph-properties-panel.component.html',
  styles: [`
    .panel { position: absolute; top: 12px; right: 160px; z-index: 20; width: 280px; max-height: calc(100% - 80px); background: color-mix(in srgb, var(--bg-primary) 92%, transparent); backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; font-size: 12px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
    .panel-header h3 { font-size: 13px; font-weight: 600; }
    .panel-body { overflow-y: auto; padding: 8px 12px 12px; flex: 1; }
    .panel-actions { display: flex; gap: 4px; }
    .action-btn { width: 26px; height: 26px; border: 1px solid var(--border-color); border-radius: var(--radius); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.15s; }
    .action-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-color); margin-top: 10px; margin-bottom: 4px; }
    .prop-row { display: flex; align-items: flex-start; gap: 4px; padding: 2px 0; border-bottom: 1px solid var(--border-color); min-height: 22px; }
    .prop-row:last-child { border-bottom: none; }
    .prop-name { color: var(--text-secondary); font-weight: 500; flex-shrink: 0; min-width: 60px; }
    .prop-value { flex: 1; word-break: break-all; cursor: default; }
    .prop-value.clickable { cursor: pointer; color: var(--accent-color); }
    .prop-value.clickable:hover { text-decoration: underline; }
    .prop-edit-btn { flex-shrink: 0; width: 18px; height: 18px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
    .prop-row:hover .prop-edit-btn { opacity: 1; }
    .prop-edit-btn:hover { color: var(--accent-color); }
    .neighbors-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .neighbor-chip { padding: 2px 8px; border-radius: 12px; background: var(--bg-tertiary); font-size: 11px; cursor: pointer; transition: background 0.15s; }
    .neighbor-chip:hover { background: var(--accent-color); color: white; }
    .close-btn { width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; border-radius: var(--radius); }
    .close-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .node-badge { display: inline-block; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  `]
})
export class GraphPropertiesPanelComponent {
  node = input<GraphNode | null>(null);
  edge = input<GraphEdge | null>(null);
  neighbors = input<{ id: string; label: string }[]>([]);

  close = output<void>();
  expandNode = output<string>();
  pruneNode = output<string>();
  navigateToNode = output<string>();
  editProperty = output<{ type: 'node' | 'edge'; field: string; value: any; nodeId?: string; edgeSource?: string; edgeTarget?: string }>();

  colorFor(type: string): string {
    const colors: Record<string, string> = {
      person: '#4169E1', organization: '#00cc00', location: '#cf6d17',
      concept: '#e3493b', event: '#9b59b6', object: '#1abc9c',
      book: '#8e44ad', author: '#2c3e50', publication: '#16a085',
      field: '#d35400', method: '#2980b9'
    };
    return colors[type?.toLowerCase()] || '#95a5a6';
  }

  onEdit(field: string, value: any) {
    if (this.node()) {
      this.editProperty.emit({ type: 'node', field, value, nodeId: this.node()!.id });
    } else if (this.edge()) {
      this.editProperty.emit({ type: 'edge', field, value, edgeSource: this.edge()!.source, edgeTarget: this.edge()!.target });
    }
  }
}
