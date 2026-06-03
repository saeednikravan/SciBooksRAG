import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styles: [`
    .sidebar { width: 190px; min-width: 190px; background: var(--bg-secondary); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; transition: width 0.2s ease, min-width 0.2s ease; overflow: hidden; }
    .sidebar.collapsed { width: 48px; min-width: 48px; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 12px; border-bottom: 1px solid var(--border-color); gap: 8px; }
    .logo-text { font-weight: 700; font-size: 15px; color: var(--text-primary); white-space: nowrap; }
    .toggle-btn { flex-shrink: 0; }
    .sidebar-nav { flex: 1; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius); cursor: pointer; text-decoration: none; color: var(--text-secondary); transition: all var(--transition); white-space: nowrap; font-size: 13px; font-weight: 500; }
    .nav-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .nav-item.active { background: var(--accent-color); color: #ffffff; }
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; color: currentColor; }
    .nav-label { overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class SidebarComponent {
  collapsed = signal(false);

  toggle() { this.collapsed.update(v => !v); }
}
