import { Component, input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styles: [`
    :host { display: block; }
    .app-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); }
    .header-left h2 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .header-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success-color); }
    .header-user-btn { width: 36px; height: 36px; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition); }
    .header-user-btn:hover { background: var(--bg-tertiary); color: var(--danger-color); border-color: var(--danger-color); }
  `]
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  title = input.required<string>();

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
