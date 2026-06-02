import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphStateService } from '../../services/graph-state.service';

@Component({
  selector: 'app-graph-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="position: relative;">
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Settings"
        (click)="isOpen.set(!isOpen())">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
      @if (isOpen()) {
        <div class="panel" style="position: absolute; bottom: 0; right: 0; width: 240px; padding: 12px; z-index: 100;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.showPropertyPanel()"
                (change)="graphState.showPropertyPanel.set(!graphState.showPropertyPanel())">
              Show Properties Panel
            </label>
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.showNodeSearchBar()"
                (change)="graphState.showNodeSearchBar.set(!graphState.showNodeSearchBar())">
              Show Search Bar
            </label>
            <div class="separator"></div>
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.showNodeLabel()"
                (change)="graphState.showNodeLabel.set(!graphState.showNodeLabel())">
              Show Node Labels
            </label>
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.enableNodeDrag()"
                (change)="graphState.enableNodeDrag.set(!graphState.enableNodeDrag())">
              Node Draggable
            </label>
            <div class="separator"></div>
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.showEdgeLabel()"
                (change)="graphState.showEdgeLabel.set(!graphState.showEdgeLabel())">
              Show Edge Labels
            </label>
            <label class="checkbox-group">
              <input type="checkbox" [checked]="graphState.enableHideUnselectedEdges()"
                (change)="graphState.enableHideUnselectedEdges.set(!graphState.enableHideUnselectedEdges())">
              Hide Unselected Edges
            </label>
            <div class="separator"></div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 13px;">Max Query Depth</label>
              <input class="input" type="number" [value]="graphState.maxQueryDepth()"
                (change)="onMaxDepthChange($event)" min="1" max="10">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 13px;">Max Nodes</label>
              <input class="input" type="number" [value]="graphState.maxNodes()"
                (change)="onMaxNodesChange($event)" min="1" max="1000">
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class GraphSettingsComponent {
  graphState = inject(GraphStateService);
  isOpen = signal(false);

  onMaxDepthChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 1) this.graphState.maxQueryDepth.set(value);
  }

  onMaxNodesChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 1 && value <= 1000) this.graphState.maxNodes.set(value);
  }
}
