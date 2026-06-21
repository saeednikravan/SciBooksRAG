import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/protected-layout.component').then(m => m.ProtectedLayoutComponent),
    children: [
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent)
      },
      {
        path: 'graph',
        loadComponent: () => import('./features/graph/graph.component').then(m => m.GraphComponent)
      },
      { path: '', redirectTo: '/chat', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/chat' }
];
