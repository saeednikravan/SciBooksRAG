import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphStateService } from '../../services/graph-state.service';
import { LightragApiService } from '../../services/lightrag-api.service';

@Component({
  selector: 'app-graph-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="position: relative;">
      <input
        class="input search-input"
        [class.expanded]="isFocused()"
        type="text"
        placeholder="Search nodes..."
        [value]="searchQuery()"
        (input)="onSearch($event)"
        (focus)="isFocused.set(true)"
        (blur)="onBlur()"
      />
      @if (searchResults().length > 0 && isFocused()) {
        <div class="async-dropdown-menu" style="position: absolute; top: 100%; left: 0; min-width: 100%;">
          @for (result of searchResults(); track result.id) {
            <div class="async-dropdown-item"
              (mousedown)="selectNode(result.id)"
              (mouseenter)="hoverNode.set(result.id)"
              [class.active]="hoverNode() === result.id">
              <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"
                  [style.background]="getNodeColor(result.id)"></div>
                <span style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ result.label }}
                </span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class GraphSearchComponent {
  private graphState = inject(GraphStateService);
  private api = inject(LightragApiService);

  searchQuery = signal('');
  searchResults = signal<{ id: string; label: string }[]>([]);
  isFocused = signal(false);
  hoverNode = signal<string | null>(null);

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);

    if (!query.trim()) {
      const nodes = this.graphState.graphNodes();
      this.searchResults.set(
        nodes.slice(0, 20).map(n => ({ id: n.id, label: n.label }))
      );
      return;
    }

    const nodes = this.graphState.graphNodes();
    const q = query.toLowerCase();
    const results = nodes
      .filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      .slice(0, 20)
      .map(n => ({ id: n.id, label: n.label }));
    this.searchResults.set(results);
  }

  onBlur() {
    setTimeout(() => {
      this.isFocused.set(false);
      this.searchResults.set([]);
    }, 200);
  }

  selectNode(nodeId: string) {
    this.graphState.setSelectedNode(nodeId);
    this.searchQuery.set(this.graphState.getNode(nodeId)?.labels.join(', ') || nodeId);
    this.isFocused.set(false);
    this.searchResults.set([]);
  }

  getNodeColor(nodeId: string): string {
    const raw = this.graphState.getNode(nodeId);
    return raw?.color || '#666';
  }
}
