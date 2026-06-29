import { Component, input, output } from '@angular/core';
import { GraphNode, GraphEdge } from '../../core/models/graph.model';

@Component({
  selector: 'app-graph-properties-panel',
  standalone: true,
  imports: [],
  templateUrl: './graph-properties-panel.component.html',
  styles: [`
    .panel { position: absolute; top: 0; right: 0; bottom: 0; z-index: 20; background: color-mix(in srgb, var(--bg-primary) 92%, transparent); backdrop-filter: blur(12px); border-left: 1px solid var(--border-color); display: flex; flex-direction: column; font-size: 13px; transition: width 0.1s; }
    .resize-handle { position: absolute; top: 0; bottom: 0; left: -6px; width: 12px; cursor: col-resize; z-index: 25; display: flex; align-items: center; justify-content: center; }
    .resize-handle::after { content: ''; width: 2px; height: 40px; background: var(--border-color); border-radius: 1px; transition: all 0.2s; }
    .resize-handle:hover::after { background: var(--accent-color); height: 60px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
    .panel-header h3 { font-size: 16px; font-weight: 600; }
    .panel-body { overflow-y: auto; padding: 16px 20px; flex: 1; }
    .panel-actions { display: flex; gap: 4px; }
    .action-btn { width: 26px; height: 26px; border: 1px solid var(--border-color); border-radius: var(--radius); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.15s; }
    .action-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-color); margin-top: 16px; margin-bottom: 8px; }
    .prop-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border-color); min-height: 32px; }
    .prop-row:last-child { border-bottom: none; }
    .prop-name { color: var(--text-secondary); font-weight: 500; flex-shrink: 0; min-width: 80px; font-size: 13px; }
    .prop-value { flex: 1; word-break: break-all; cursor: default; font-size: 14px; }
    .prop-value.clickable { cursor: pointer; color: var(--accent-color); }
    .prop-value.clickable:hover { text-decoration: underline; }
    .prop-edit-btn { flex-shrink: 0; width: 18px; height: 18px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
    .prop-row:hover .prop-edit-btn { opacity: 1; }
    .prop-edit-btn:hover { color: var(--accent-color); }
    .neighbors-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .neighbor-chip { padding: 6px 14px; border-radius: 16px; background: var(--bg-tertiary); font-size: 13px; cursor: pointer; transition: background 0.15s; }
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
  width = input<number>(21);

  close = output<void>();
  widthChange = output<number>();
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

  private resizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.resizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.width();
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', this.onResize.bind(this));
    document.addEventListener('mouseup', this.stopResize.bind(this));
  }

  private onResize(event: MouseEvent) {
    if (!this.resizing) return;
    const container = document.querySelector('.graph-content') as HTMLElement;
    if (!container) return;
    const dx = this.resizeStartX - event.clientX;
    const containerWidth = container.clientWidth;
    const deltaPercent = (dx / containerWidth) * 100;
    let newWidth = this.resizeStartWidth + deltaPercent;
    newWidth = Math.max(15, Math.min(60, newWidth));
    this.widthChange.emit(newWidth);
  }

  private stopResize() {
    this.resizing = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', this.onResize.bind(this));
    document.removeEventListener('mouseup', this.stopResize.bind(this));
  }
}
