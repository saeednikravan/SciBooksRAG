import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatStateService } from '../../core/services/chat-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styles: [`
    :host {
      --sidebar-width: 240px;
      --sidebar-collapsed: 56px;
      display: block;
    }

    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      height: 100vh;
      background: var(--bg-secondary, #f8f9fa);
      border-right: 1px solid var(--border-color, #e9ecef);
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      position: relative;
    }

    .sidebar.collapsed {
      width: var(--sidebar-collapsed);
      min-width: var(--sidebar-collapsed);
    }

    /* ── Header ── */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 12px;
      gap: 8px;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-color, #cc785c), var(--accent-hover, #b86548));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-icon svg {
      width: 18px;
      height: 18px;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary, #1a1a2e);
      white-space: nowrap;
      letter-spacing: -0.3px;
    }

    .collapse-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted, #adb5bd);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .collapse-btn:hover {
      background: var(--bg-tertiary, #e9ecef);
      color: var(--text-primary, #1a1a2e);
    }

    .collapse-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.25s ease;
    }

    .collapse-icon.flip {
      transform: rotate(180deg);
    }

    /* ── User Section ── */
    .user-section {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px 16px;
      flex-shrink: 0;
    }

    .sidebar.collapsed .user-section {
      padding: 8px 14px 12px;
      justify-content: center;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-tertiary, #e9ecef);
      color: var(--text-secondary, #6c757d);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-avatar svg {
      width: 16px;
      height: 16px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #1a1a2e);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-status {
      font-size: 11px;
      color: var(--text-muted, #adb5bd);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .user-status::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
    }

    /* ── Navigation ── */
    .sidebar-nav {
      flex: 1;
      padding: 0 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      color: var(--text-secondary, #6c757d);
      transition: all 0.2s ease;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
      position: relative;
    }

    .nav-item:hover {
      background: var(--bg-tertiary, #e9ecef);
      color: var(--text-primary, #1a1a2e);
    }

    .nav-item.active {
      background: var(--accent-color, #cc785c);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(204, 120, 92, 0.3);
    }

    .nav-icon-wrapper {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-icon {
      width: 18px;
      height: 18px;
    }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge {
      margin-left: auto;
      background: rgba(255, 255, 255, 0.25);
      color: inherit;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
      flex-shrink: 0;
    }

    .nav-item.active .nav-badge {
      background: rgba(255, 255, 255, 0.25);
    }

    /* ── Divider & Section ── */
    .sidebar-divider {
      height: 1px;
      background: var(--border-color, #e9ecef);
      margin: 4px 14px;
      flex-shrink: 0;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #adb5bd);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 12px 14px 6px;
      flex-shrink: 0;
    }

    .history-list {
      padding: 0 8px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }

    .history-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-secondary, #6c757d);
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
    }

    .history-item:hover {
      background: var(--bg-tertiary, #e9ecef);
      color: var(--text-primary, #1a1a2e);
    }

    .history-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .history-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Footer ── */
    .sidebar-footer {
      padding: 8px;
      flex-shrink: 0;
      border-top: 1px solid var(--border-color, #e9ecef);
      margin-top: auto;
    }

    .footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-secondary, #6c757d);
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
    }

    .sidebar.collapsed .footer-btn {
      justify-content: center;
      padding: 10px;
    }

    .footer-btn:hover {
      background: rgba(198, 69, 69, 0.08);
      color: var(--danger-color, #c64545);
    }

    .footer-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .footer-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SidebarComponent {
  collapsed = signal(false);
  private auth = inject(AuthService);
  private router = inject(Router);
  chatState = inject(ChatStateService);

  toggle() {
    this.collapsed.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
