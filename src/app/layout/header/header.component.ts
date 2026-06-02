import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styles: [`
    .app-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); }
    .app-header h2 { font-size: 16px; font-weight: 600; }
    .header-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #2ecc71; }
  `]
})
export class HeaderComponent {
  title = input.required<string>();
}
