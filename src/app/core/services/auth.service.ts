import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'lightrag_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  async login(username: string, password: string): Promise<boolean> {
    try {
      const body = new URLSearchParams();
      body.set('username', username);
      body.set('password', password);

      const result = await firstValueFrom(
        this.http.post<{ access_token: string; token_type: string }>(
          `${environment.apiBaseUrl}/login`,
          body.toString(),
          {
            headers: new HttpHeaders({
              'Content-Type': 'application/x-www-form-urlencoded'
            })
          }
        )
      );

      if (result.access_token) {
        localStorage.setItem(TOKEN_KEY, result.access_token);
        this.isLoggedInSubject.next(true);
        return true;
      }
      return false;
    } catch (err: any) {
      const detail = err?.error?.detail || 'خطا در ارتباط با سرور';
      throw new Error(detail);
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedInSubject.next(false);
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
