import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphStateService } from '../../services/graph-state.service';

@Component({
  selector: 'app-graph-legend',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (graphState.typeColorMap().size > 0) {
      <div class="panel" style="padding: 12px; max-width: 250px;">
        <h3 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Legend</h3>
        <div class="scroll-area" style="max-height: 300px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            @for (entry of colorEntries(); track entry[0]) {
              <div class="legend-item">
                <div class="legend-color" [style.background]="entry[1]"></div>
                <span class="legend-label">{{ entry[0] }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class GraphLegendComponent {
  graphState = inject(GraphStateService);

  colorEntries(): [string, string][] {
    return Array.from(this.graphState.typeColorMap().entries());
  }
}
