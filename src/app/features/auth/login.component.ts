import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styles: [`
    .login-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); }
    .login-card { padding: 40px; width: 360px; text-align: center; }
    .login-logo { margin-bottom: 12px; }
    .login-card h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin-bottom: 24px; }
    .login-form { display: flex; flex-direction: column; gap: 12px; }
    .form-group { text-align: left; }
    .form-group label { display: block; font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; }
    .form-group .input { width: 100%; padding: 10px 12px; font-size: 14px; }
    .login-btn { width: 100%; padding: 10px; font-size: 14px; }
    .error-message { background: #fde8e8; color: #c0392b; padding: 8px 12px; border-radius: var(--radius); font-size: 13px; margin-bottom: 12px; }
    .loading-spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = 'admin';
  password = 'Admin@1234';
  error = signal('');
  loading = signal(false);

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? 'Invalid username or password.'
            : 'Could not connect to the server. Is SciBooksRAG running?'
        );
      }
    });
  }
}
