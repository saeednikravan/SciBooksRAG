import { Routes } from '@angular/router';
import { GraphViewerComponent } from './components/graph-viewer.component';

export const routes: Routes = [
  { path: '', component: GraphViewerComponent },
  { path: '**', redirectTo: '' }
];
