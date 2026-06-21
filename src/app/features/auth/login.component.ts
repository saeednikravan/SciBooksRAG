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
    .login-card { padding: 48px 40px; width: 380px; text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-xl); background: var(--bg-primary); }
    .login-logo { margin-bottom: 16px; }
    .login-card h1 { font-size: 24px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
    .subtitle { color: var(--text-tertiary); font-size: 13px; margin-bottom: 28px; }
    .login-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { text-align: left; }
    .form-group label { display: block; font-size: 12px; font-weight: 500; color: var(--text-tertiary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group .input { width: 100%; padding: 10px 14px; font-size: 14px; }
    .login-btn { width: 100%; padding: 10px; font-size: 14px; }
    .error-message { background: rgba(198,69,69,0.08); color: var(--danger-color); padding: 10px 14px; border-radius: var(--radius); font-size: 13px; margin-bottom: 16px; border: 1px solid rgba(198,69,69,0.15); }
    .loading-spinner-small { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = 'admin';
  password = 'Admin1234';
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
        this.error.set(err.message || 'Invalid username or password.');
      }
    });
  }
}
