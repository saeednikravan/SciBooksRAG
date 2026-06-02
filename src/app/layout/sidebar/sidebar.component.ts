import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styles: [`
    .sidebar { width: 220px; min-width: 220px; background: var(--bg-secondary); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; transition: width 0.2s ease, min-width 0.2s ease; overflow: hidden; }
    .sidebar.collapsed { width: 52px; min-width: 52px; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color); gap: 8px; }
    .logo-text { font-weight: 700; font-size: 15px; white-space: nowrap; }
    .toggle-btn { flex-shrink: 0; }
    .sidebar-nav { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius); cursor: pointer; text-decoration: none; color: var(--text-primary); transition: background 0.15s; white-space: nowrap; font-size: 13px; }
    .nav-item:hover { background: var(--bg-tertiary); }
    .nav-item.active { background: var(--accent-color); color: white; }
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; color: currentColor; }
    .nav-label { overflow: hidden; text-overflow: ellipsis; }
    .sidebar-footer { padding: 8px; border-top: 1px solid var(--border-color); }
    .logout-btn { width: 100%; background: none; border: none; font: inherit; color: var(--text-secondary); }
    .logout-btn:hover { color: #e74c3c; background: rgba(231,76,60,0.1); }
  `]
})
export class SidebarComponent {
  private auth = inject(AuthService);
  collapsed = signal(false);

  toggle() { this.collapsed.update(v => !v); }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}
