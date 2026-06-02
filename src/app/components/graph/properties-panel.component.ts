import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphStateService, RawNode, RawEdge } from '../../services/graph-state.service';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (currentElement()) {
      <div class="properties-panel">
        @if (elementType() === 'node') {
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 14px; font-weight: 600; color: #4169E1;">Node Properties</h3>
            </div>
            <div style="background: rgba(0,0,0,0.03); border-radius: 6px; padding: 6px; max-height: 250px; overflow-y: auto;">
              <div class="property-row">
                <span class="property-name">ID:</span>
                <span class="property-value">{{ nodeData()?.id }}</span>
              </div>
              <div class="property-row">
                <span class="property-name">Labels:</span>
                <span class="property-value">{{ nodeData()?.labels?.join(', ') }}</span>
              </div>
              <div class="property-row">
                <span class="property-name">Degree:</span>
                <span class="property-value">{{ nodeData()?.degree }}</span>
              </div>
            </div>
            <h3 style="font-size: 14px; font-weight: 600; color: #d4a017;">Properties</h3>
            <div style="background: rgba(0,0,0,0.03); border-radius: 6px; padding: 6px; max-height: 250px; overflow-y: auto;">
              @for (entry of nodeProperties(); track entry[0]) {
                <div class="property-row">
                  <span class="property-name">{{ entry[0] }}:</span>
                  <span class="property-value" [title]="formatValue(entry[1])">{{ formatValue(entry[1]) }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #8b5cf6;">Edge Properties</h3>
            <div style="background: rgba(0,0,0,0.03); border-radius: 6px; padding: 6px;">
              <div class="property-row">
                <span class="property-name">Source:</span>
                <span class="property-value">{{ edgeData()?.source }}</span>
              </div>
              <div class="property-row">
                <span class="property-name">Target:</span>
                <span class="property-value">{{ edgeData()?.target }}</span>
              </div>
            </div>
            <h3 style="font-size: 14px; font-weight: 600; color: #d4a017;">Properties</h3>
            <div style="background: rgba(0,0,0,0.03); border-radius: 6px; padding: 6px; max-height: 250px; overflow-y: auto;">
              @for (entry of edgeProperties(); track entry[0]) {
                <div class="property-row">
                  <span class="property-name">{{ entry[0] }}:</span>
                  <span class="property-value" [title]="formatValue(entry[1])">{{ formatValue(entry[1]) }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `
})
export class PropertiesPanelComponent {
  graphState = inject(GraphStateService);

  elementType = computed<'node' | 'edge' | null>(() => {
    if (this.graphState.focusedNode() || this.graphState.selectedNode()) return 'node';
    if (this.graphState.focusedEdge() || this.graphState.selectedEdge()) return 'edge';
    return null;
  });

  currentElement = computed(() => {
    return this.nodeData() || this.edgeData();
  });

  nodeData = computed<RawNode | null>(() => {
    const id = this.graphState.focusedNode() || this.graphState.selectedNode();
    if (!id) return null;
    return this.graphState.getNode(id) || null;
  });

  edgeData = computed<RawEdge | null>(() => {
    const id = this.graphState.focusedEdge() || this.graphState.selectedEdge();
    if (!id) return null;
    return this.graphState.getEdge(id) || null;
  });

  nodeProperties = computed(() => {
    const node = this.nodeData();
    if (!node) return [];
    return Object.entries(node.properties)
      .filter(([k]) => k !== 'created_at' && k !== 'truncate')
      .sort(([a], [b]) => a.localeCompare(b));
  });

  edgeProperties = computed(() => {
    const edge = this.edgeData();
    if (!edge) return [];
    return Object.entries(edge.properties)
      .filter(([k]) => k !== 'created_at' && k !== 'truncate')
      .sort(([a], [b]) => a.localeCompare(b));
  });

  formatValue(value: any): string {
    if (typeof value === 'string') return value.replace(/<SEP>/g, ';\n');
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
}
