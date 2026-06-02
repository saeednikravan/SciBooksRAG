import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphStateService } from '../../services/graph-state.service';
import { LightragApiService } from '../../services/lightrag-api.service';

@Component({
  selector: 'app-graph-labels',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="btn btn-icon btn-ghost tooltip" data-tooltip="Refresh"
        (click)="refresh()" [disabled]="isRefreshing()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          [style.animation]="isRefreshing() ? 'spin 0.8s linear infinite' : 'none'">
          <path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/>
        </svg>
      </button>
      <div style="position: relative;">
        <select class="input" style="min-width: 200px; max-width: 400px;"
          [value]="graphState.queryLabel()"
          (change)="onLabelChange($event)">
          <option value="*">*</option>
          @for (label of labels(); track label) {
            <option [value]="label">{{ label }}</option>
          }
        </select>
      </div>
    </div>
  `
})
export class GraphLabelsComponent implements OnInit {
  graphState = inject(GraphStateService);
  private api = inject(LightragApiService);

  labels = signal<string[]>([]);
  isRefreshing = signal(false);

  ngOnInit() {
    this.loadLabels();
  }

  private loadLabels() {
    this.api.getPopularLabels(300).subscribe({
      next: (labels) => this.labels.set(labels),
      error: () => this.labels.set(['entity', 'relationship', 'document'])
    });
  }

  onLabelChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.graphState.queryLabel.set(value);
  }

  refresh() {
    this.isRefreshing.set(true);
    this.loadLabels();
    setTimeout(() => this.isRefreshing.set(false), 1000);
  }
}
