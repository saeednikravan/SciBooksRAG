import { Component, inject, ViewChild, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphRendererComponent } from './graph/graph-renderer.component';
import { GraphSearchComponent } from './graph/graph-search.component';
import { GraphLabelsComponent } from './graph/graph-labels.component';
import { GraphZoomControlsComponent } from './graph/graph-zoom-controls.component';
import { GraphLayoutControlsComponent } from './graph/graph-layout-controls.component';
import { GraphSettingsComponent } from './graph/graph-settings.component';
import { GraphLegendComponent } from './graph/graph-legend.component';
import { PropertiesPanelComponent } from './graph/properties-panel.component';
import { GraphStateService } from './services/graph-state.service';
import { LightragApiService } from './services/lightrag-api.service';

@Component({
  selector: 'app-graph-viewer',
  standalone: true,
  imports: [
    CommonModule,
    GraphRendererComponent,
    GraphSearchComponent,
    GraphLabelsComponent,
    GraphZoomControlsComponent,
    GraphLayoutControlsComponent,
    GraphSettingsComponent,
    GraphLegendComponent,
    PropertiesPanelComponent
  ],
  template: `
    <div class="graph-container" [attr.data-theme]="graphState.theme()">
      <!-- Graph Canvas -->
      <app-graph-renderer #graphRenderer></app-graph-renderer>

      <!-- Top Left: Labels + Search -->
      <div class="controls-top-left">
        <app-graph-labels></app-graph-labels>
        @if (graphState.showNodeSearchBar()) {
          <app-graph-search></app-graph-search>
        }
      </div>

      <!-- Bottom Left: Controls -->
      <div class="controls-left-bottom">
        <app-graph-layout-controls (onRunLayout)="runLayout()"></app-graph-layout-controls>
        <app-graph-zoom-controls></app-graph-zoom-controls>
        <app-graph-settings></app-graph-settings>
      </div>

      <!-- Top Right: Properties Panel -->
      @if (graphState.showPropertyPanel()) {
        <div class="controls-right-top">
          <app-properties-panel></app-properties-panel>
        </div>
      }

      <!-- Bottom Right: Legend -->
      <div class="controls-right-bottom">
        <app-graph-legend></app-graph-legend>
      </div>

      <!-- Loading Overlay -->
      @if (graphState.isFetching()) {
        <div class="loading-overlay">
          <div class="spinner-container">
            <div class="loading-spinner"></div>
            <p>Loading Graph Data...</p>
          </div>
        </div>
      }
    </div>
  `
})
export class GraphViewerComponent implements OnInit {
  @ViewChild('graphRenderer') graphRenderer!: GraphRendererComponent;

  graphState = inject(GraphStateService);
  private api = inject(LightragApiService);

  constructor() {
    // Watch for query label changes and fetch data
    effect(() => {
      const label = this.graphState.queryLabel();
      const maxDepth = this.graphState.maxQueryDepth();
      const maxNodes = this.graphState.maxNodes();
      this.fetchGraphData(label, maxDepth, maxNodes);
    });
  }

  ngOnInit() {
    this.fetchGraphData(
      this.graphState.queryLabel(),
      this.graphState.maxQueryDepth(),
      this.graphState.maxNodes()
    );
  }

  private fetchGraphData(label: string, maxDepth: number, maxNodes: number) {
    this.graphState.isFetching.set(true);
    this.graphState.clearSelection();

    this.api.queryGraphs(label, maxDepth, maxNodes).subscribe({
      next: (data) => {
        this.graphState.setGraphData(data);
        this.graphState.isFetching.set(false);
      },
      error: (err) => {
        console.error('Error fetching graph:', err);
        this.graphState.isFetching.set(false);
        this.graphState.reset();
      }
    });
  }

  runLayout() {
    if (this.graphRenderer) {
      this.graphRenderer.runLayout();
    }
  }
}
