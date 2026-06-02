import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphStateService } from '../../services/graph-state.service';

@Component({
  selector: 'app-graph-layout-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Run Layout"
      (click)="onRunLayout.emit()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </button>
  `
})
export class GraphLayoutControlsComponent {
  onRunLayout = output<void>();
}
