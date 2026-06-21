import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// prettier-ignore
const CREDENTIALS = [
  { username: 'admin', password: 'Admin1234', role: 'admin' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  login(username: string, password: string): Observable<LoginResponse> {
    const user = CREDENTIALS.find(
      c => c.username === username && c.password === password
    );

    if (!user) {
      return throwError(() => new Error('Invalid username or password'));
    }

    const fakeToken = this.createFakeToken(user);
    localStorage.setItem('scibooksrag_token', fakeToken);
    this.isLoggedInSubject.next(true);

    return new Observable(observer => {
      observer.next({ access_token: fakeToken, token_type: 'Bearer' });
      observer.complete();
    });
  }

  logout(): void {
    localStorage.removeItem('scibooksrag_token');
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('scibooksrag_token');
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('scibooksrag_token');
  }

  private createFakeToken(user: { username: string; role: string }): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      })
    );
    const signature = btoa('fake-signature');
    return `${header}.${payload}.${signature}`;
  }
}
