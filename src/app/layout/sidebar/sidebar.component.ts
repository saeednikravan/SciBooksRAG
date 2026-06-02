import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          @if (!collapsed()) {
            <span class="logo-text">SciBooksRAG</span>
          }
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (collapsed()) {
              <polyline points="9 18 15 12 9 6"/>
            } @else {
              <polyline points="15 18 9 12 15 6"/>
            }
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <a routerLink="/chat" routerLinkActive="active" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          @if (!collapsed()) { <span>Chat</span> }
        </a>
        <a routerLink="/graph" routerLinkActive="active" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <circle cx="19" cy="5" r="2"/>
            <circle cx="5" cy="5" r="2"/>
            <circle cx="19" cy="19" r="2"/>
            <circle cx="5" cy="19" r="2"/>
            <line x1="12" y1="9" x2="12" y2="5"/>
            <line x1="14.5" y1="13.5" x2="17" y2="17"/>
            <line x1="9.5" y1="13.5" x2="7" y2="17"/>
          </svg>
          @if (!collapsed()) { <span>Knowledge Graph</span> }
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" (click)="logout()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          @if (!collapsed()) { <span>Log out</span> }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      min-width: 240px;
      height: 100vh;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, min-width 0.2s ease;
      overflow: hidden;
    }
    .sidebar.collapsed {
      width: 64px;
      min-width: 64px;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #1e293b;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #22c55e;
    }
    .logo-text {
      font-size: 16px;
      font-weight: 700;
      white-space: nowrap;
    }
    .collapse-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .collapse-btn:hover { color: #e2e8f0; }
    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      transition: all 0.15s;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      font-size: 14px;
      white-space: nowrap;
    }
    .nav-item:hover { background: #1e293b; color: #e2e8f0; }
    .nav-item.active { background: #1e293b; color: #22c55e; }
    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid #1e293b;
    }
    .logout-btn:hover { color: #ef4444 !important; }
  `]
})
export class SidebarComponent {
  collapsed = signal(false);
  private authService = inject(AuthService);

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }

  logout() {
    this.authService.logout();
  }
}
