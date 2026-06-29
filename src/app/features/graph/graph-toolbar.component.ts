import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [],
  templateUrl: './graph-toolbar.component.html',
  styles: [`
    .toolbar { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 20; display: flex; align-items: center; gap: 2px; background: color-mix(in srgb, var(--bg-primary) 90%, transparent); backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 4px 8px; }
    .toolbar-divider { width: 1px; height: 24px; background: var(--border-color); margin: 0 4px; }
    .tb-btn { width: 32px; height: 32px; border: none; border-radius: var(--radius); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.15s; }
    .tb-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .tb-btn.active { background: var(--accent-color); color: white; }
    .tb-btn:disabled { opacity: 0.3; cursor: default; }
    .popover { position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); z-index: 30; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 12px; min-width: 200px; max-height: 300px; overflow-y: auto; }
    .popover-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: all 0.15s; }
    .popover-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .popover-item.active { background: var(--accent-color); color: white; }
    .layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .layout-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px; border: 1px solid var(--border-color); border-radius: var(--radius); background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 10px; transition: all 0.15s; }
    .layout-btn:hover { border-color: var(--accent-color); color: var(--text-primary); }
    .layout-btn.active { border-color: var(--accent-color); background: color-mix(in srgb, var(--accent-color) 10%, transparent); color: var(--accent-color); }
    .zoom-level { font-size: 11px; color: var(--text-muted); min-width: 36px; text-align: center; font-variant-numeric: tabular-nums; }
    .settings-toggle { width: 32px; }
    .settings-toggle input { display: none; }
    .settings-toggle label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: var(--text-secondary); }
    .settings-toggle .track { width: 28px; height: 14px; border-radius: 7px; background: var(--border-color); position: relative; transition: background 0.2s; }
    .settings-toggle .track .thumb { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--text-muted); transition: all 0.2s; }
    .settings-toggle input:checked + .track { background: var(--accent-color); }
    .settings-toggle input:checked + .track .thumb { left: 16px; background: white; }
  `]
})
export class GraphToolbarComponent {
  zoom = input(0.8);
  nodeCount = input(0);
  edgeCount = input(0);
  layout = input('circular');
  settingsOpen = input(false);

  zoomIn = output<void>();
  zoomOut = output<void>();
  zoomReset = output<void>();
  fullscreen = output<void>();
  toggleLegend = output<void>();
  toggleSettings = output<void>();
  changeLayout = output<string>();
  toggleNodeDrag = output<boolean>();

  showSettings = false;
  showLayouts = false;
  showCounts = false;

  toggleSettingsPopover() {
    this.showSettings = !this.showSettings;
    this.showLayouts = false;
  }

  toggleLayouts() {
    this.showLayouts = !this.showLayouts;
    this.showSettings = false;
  }

  selectLayout(l: string) {
    this.changeLayout.emit(l);
    this.showLayouts = false;
  }
}
