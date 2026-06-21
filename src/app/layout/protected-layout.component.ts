import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';

@Component({
  selector: 'app-protected-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  `]
})
export class ProtectedLayoutComponent {}
