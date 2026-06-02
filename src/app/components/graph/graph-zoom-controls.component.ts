import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphStateService } from '../../services/graph-state.service';

@Component({
  selector: 'app-graph-zoom-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="controls-left-bottom">
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Rotate Clockwise"
        (click)="rotate(1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/>
        </svg>
      </button>
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Rotate Counter-Clockwise"
        (click)="rotate(-1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>
        </svg>
      </button>
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Reset Zoom"
        (click)="resetZoom()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Zoom In"
        (click)="zoomIn()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>
        </svg>
      </button>
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Zoom Out"
        (click)="zoomOut()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>
        </svg>
      </button>
    </div>
  `
})
export class GraphZoomControlsComponent {
  private graphState = inject(GraphStateService);

  rotate(direction: number) {
    // Canvas rotation not directly applicable; skip for now
  }
  resetZoom() {}
  zoomIn() {}
  zoomOut() {}
}
