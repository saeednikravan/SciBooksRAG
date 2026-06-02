import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="app-header">
      <div class="header-left">
        <h2>{{ title() }}</h2>
      </div>
      <div class="header-right">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Connected</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-left h2 {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .status-indicator {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: #64748b;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34,197,94,0.4);
    }
  `]
})
export class HeaderComponent {
  title = input.required<string>();
}
