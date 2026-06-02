import {
  Component, OnInit, OnDestroy, signal, inject,
  ElementRef, ViewChild, afterNextRender
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import * as d3 from 'd3';
import { GraphService } from '../../core/services/graph.service';
import { AuthService } from '../../core/services/auth.service';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../core/models/graph.model';
import { HeaderComponent } from '../../layout/header/header.component';

interface D3Node extends d3.SimulationNodeDatum {
  id: string; label: string; entity_type?: string; degree?: number;
}
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  description?: string; weight?: number;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
    <div class="graph-page">
      <app-header title="Knowledge Graph" />

      <div class="graph-toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" [(ngModel)]="searchQuery" name="search" placeholder="Search entities..." (input)="onSearch()" />
          </div>
          <div class="label-select">
            <select [(ngModel)]="selectedLabel" name="label" (change)="loadGraph()">
              <option value="">Select label</option>
              @for (label of labels(); track label) {
                <option [value]="label">{{ label }}</option>
              }
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          <span class="node-count">{{ nodes().length }} nodes</span>
          <span class="edge-count">{{ edges().length }} edges</span>
          <button class="btn-icon" (click)="resetZoom()" title="Reset"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
          <button class="btn-icon" (click)="loadGraph()" title="Reload" [disabled]="isLoading()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
        </div>
      </div>

      @if (error()) {
        <div class="error-banner">
          <span>{{ error() }}</span>
          <button (click)="loadGraph()">Retry</button>
        </div>
      }

      <div class="graph-container" #graphContainer>
        @if (isLoading() && nodes().length === 0) {
          <div class="loading-overlay"><div class="spinner"></div><span>Loading graph...</span></div>
        } @else if (!isLoading() && nodes().length === 0 && !error()) {
          <div class="empty-graph">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><line x1="12" y1="9" x2="12" y2="5"/><line x1="14.5" y1="13.5" x2="17" y2="17"/><line x1="9.5" y1="13.5" x2="7" y2="17"/></svg>
            <h3>No graph to display</h3>
            <p>Select a label from the dropdown above</p>
          </div>
        }
        <svg #svgElement class="graph-svg"></svg>
        @if (tooltip().visible) {
          <div class="tooltip" [style.left.px]="tooltip().x" [style.top.px]="tooltip().y">
            <div class="tooltip-header">{{ tooltip().label }}</div>
            @if (tooltip().type) { <div class="tooltip-row"><span class="tooltip-key">Type:</span><span class="tooltip-val">{{ tooltip().type }}</span></div> }
            @if (tooltip().degree !== undefined) { <div class="tooltip-row"><span class="tooltip-key">Degree:</span><span class="tooltip-val">{{ tooltip().degree }}</span></div> }
          </div>
        }
      </div>

      <!-- CRUD Actions Floating Panel -->
      <div class="crud-fab">
        <button class="fab-btn" (click)="showCreateEntity=true" title="Create Entity"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>
        <button class="fab-btn" (click)="showEditEntity=true" title="Edit Entity"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="fab-btn" (click)="showDeleteEntity=true" title="Delete Entity"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        <button class="fab-btn" (click)="showCreateRelation=true" title="Create Relation"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
        <button class="fab-btn" (click)="showDeleteRelation=true" title="Delete Relation"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <button class="fab-btn" (click)="showMergeEntities=true" title="Merge Entities"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
      </div>

      <!-- Modals -->
      @if (showCreateEntity) {
      <div class="modal-overlay" (click.self)="showCreateEntity=false">
        <div class="modal"><div class="modal-header"><h3>Create Entity</h3><button class="modal-close" (click)="showCreateEntity=false">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Entity Name *</label><input type="text" [(ngModel)]="entityForm.name" name="ce_name" /></div>
          <div class="form-group"><label>Entity Type</label><input type="text" [(ngModel)]="entityForm.type" name="ce_type" placeholder="e.g. person, concept" /></div>
          <div class="form-group"><label>Description</label><textarea [(ngModel)]="entityForm.description" name="ce_desc" rows="3"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showCreateEntity=false">Cancel</button>
          <button class="btn-primary" (click)="createEntity()" [disabled]="crudLoading()">{{ crudLoading() ? 'Creating...' : 'Create' }}</button>
        </div></div>
      </div>
      }

      @if (showEditEntity) {
      <div class="modal-overlay" (click.self)="showEditEntity=false">
        <div class="modal"><div class="modal-header"><h3>Edit Entity</h3><button class="modal-close" (click)="showEditEntity=false">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Entity Name *</label><input type="text" [(ngModel)]="entityForm.name" name="ee_name" /></div>
          <div class="form-group"><label>New Entity Type</label><input type="text" [(ngModel)]="entityForm.type" name="ee_type" /></div>
          <div class="form-group"><label>New Description</label><textarea [(ngModel)]="entityForm.description" name="ee_desc" rows="3"></textarea></div>
          <label class="checkbox-row"><input type="checkbox" [(ngModel)]="entityForm.allowRename" name="ee_rename" /> Allow rename if name changed</label>
          <label class="checkbox-row"><input type="checkbox" [(ngModel)]="entityForm.allowMerge" name="ee_merge" /> Allow merge on conflict</label>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showEditEntity=false">Cancel</button>
          <button class="btn-primary" (click)="editEntity()" [disabled]="crudLoading()">{{ crudLoading() ? 'Saving...' : 'Save' }}</button>
        </div></div>
      </div>
      }

      @if (showDeleteEntity) {
      <div class="modal-overlay" (click.self)="showDeleteEntity=false">
        <div class="modal"><div class="modal-header"><h3>Delete Entity</h3><button class="modal-close" (click)="showDeleteEntity=false">&times;</button></div>
        <div class="modal-body">
          <p class="confirm-text">This will permanently delete the entity and all its relationships.</p>
          <div class="form-group"><label>Entity Name *</label><input type="text" [(ngModel)]="entityForm.name" name="de_name" placeholder="Enter entity name" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showDeleteEntity=false">Cancel</button>
          <button class="btn-danger" (click)="deleteEntity()" [disabled]="crudLoading() || !entityForm.name">{{ crudLoading() ? 'Deleting...' : 'Delete' }}</button>
        </div></div>
      </div>
      }

      @if (showCreateRelation) {
      <div class="modal-overlay" (click.self)="showCreateRelation=false">
        <div class="modal"><div class="modal-header"><h3>Create Relation</h3><button class="modal-close" (click)="showCreateRelation=false">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Source Entity *</label><input type="text" [(ngModel)]="relationForm.source" name="cr_source" list="nodeList" /></div>
          <div class="form-group"><label>Target Entity *</label><input type="text" [(ngModel)]="relationForm.target" name="cr_target" list="nodeList" /></div>
          <datalist id="nodeList">@for(n of nodes(); track n.id){<option [value]="n.label">}</datalist>
          <div class="form-group"><label>Description</label><input type="text" [(ngModel)]="relationForm.description" name="cr_desc" /></div>
          <div class="form-group"><label>Keywords</label><input type="text" [(ngModel)]="relationForm.keywords" name="cr_kw" placeholder="comma-separated" /></div>
          <div class="form-group"><label>Weight</label><input type="number" [(ngModel)]="relationForm.weight" name="cr_weight" min="0" step="0.1" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showCreateRelation=false">Cancel</button>
          <button class="btn-primary" (click)="createRelation()" [disabled]="crudLoading()">{{ crudLoading() ? 'Creating...' : 'Create' }}</button>
        </div></div>
      </div>
      }

      @if (showDeleteRelation) {
      <div class="modal-overlay" (click.self)="showDeleteRelation=false">
        <div class="modal"><div class="modal-header"><h3>Delete Relation</h3><button class="modal-close" (click)="showDeleteRelation=false">&times;</button></div>
        <div class="modal-body">
          <p class="confirm-text">Select two entities to remove the relationship between them.</p>
          <div class="form-group"><label>Source Entity *</label>
            <select [(ngModel)]="relationForm.source" name="dr_source"><option value="">Select...</option>@for(n of nodes(); track n.id){<option [value]="n.label">{{ n.label }}</option>}</select>
          </div>
          <div class="form-group"><label>Target Entity *</label>
            <select [(ngModel)]="relationForm.target" name="dr_target"><option value="">Select...</option>@for(n of nodes(); track n.id){<option [value]="n.label">{{ n.label }}</option>}</select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showDeleteRelation=false">Cancel</button>
          <button class="btn-danger" (click)="deleteRelation()" [disabled]="crudLoading() || !relationForm.source || !relationForm.target">{{ crudLoading() ? 'Deleting...' : 'Delete' }}</button>
        </div></div>
      </div>
      }

      @if (showMergeEntities) {
      <div class="modal-overlay" (click.self)="showMergeEntities=false">
        <div class="modal"><div class="modal-header"><h3>Merge Entities</h3><button class="modal-close" (click)="showMergeEntities=false">&times;</button></div>
        <div class="modal-body">
          <p class="confirm-text">Merge multiple entities into a single target entity. Source entities will be removed.</p>
          <div class="form-group"><label>Source Entities (comma-separated) *</label><input type="text" [(ngModel)]="mergeForm.sources" name="mg_src" placeholder="e.g. Entity1, Entity2" /></div>
          <div class="form-group"><label>Target Entity *</label><input type="text" [(ngModel)]="mergeForm.target" name="mg_tgt" list="nodeList" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showMergeEntities=false">Cancel</button>
          <button class="btn-primary" (click)="mergeEntities()" [disabled]="crudLoading()">{{ crudLoading() ? 'Merging...' : 'Merge' }}</button>
        </div></div>
      </div>
      }

      @if (showResult()) {
      <div class="modal-overlay" (click.self)="showResult.set(false)">
        <div class="modal"><div class="modal-header"><h3>{{ result().title }}</h3><button class="modal-close" (click)="showResult.set(false)">&times;</button></div>
        <div class="modal-body"><pre class="result-pre">{{ result().message }}</pre></div>
        <div class="modal-footer"><button class="btn-primary" (click)="showResult.set(false)">OK</button></div></div>
      </div>
      }
    </div>
  `,
  styles: [`
    .graph-page { display:flex; flex-direction:column; height:100vh; background:#fff; }
    .graph-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; border-bottom:1px solid #e2e8f0; background:#f8fafc; gap:12px; flex-wrap:wrap; }
    .toolbar-left, .toolbar-right { display:flex; align-items:center; gap:10px; }
    .search-box { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; }
    .search-box input { border:none; outline:none; font-size:13px; color:#0f172a; background:transparent; width:180px; }
    .search-box input::placeholder { color:#94a3b8; }
    .label-select select { padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:13px; color:#334155; background:#fff; cursor:pointer; outline:none; }
    .node-count, .edge-count { font-size:12px; color:#64748b; padding:4px 10px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; }
    .btn-icon { width:34px; height:34px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .btn-icon:hover { border-color:#22c55e; color:#22c55e; }
    .error-banner { display:flex; align-items:center; justify-content:space-between; padding:10px 24px; background:#fef2f2; border-bottom:1px solid #fecaca; color:#dc2626; font-size:13px; }
    .error-banner button { padding:4px 12px; border:1px solid #dc2626; border-radius:6px; background:#fff; color:#dc2626; cursor:pointer; font-size:12px; }
    .graph-container { flex:1; position:relative; overflow:hidden; }
    .graph-svg { width:100%; height:100%; }
    .loading-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(255,255,255,.8); gap:12px; z-index:10; }
    .spinner { width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#22c55e; border-radius:50%; animation:spin .6s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .empty-graph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#94a3b8; }
    .empty-graph h3 { margin:0; font-size:16px; color:#64748b; }
    .empty-graph p { margin:0; font-size:13px; }
    .tooltip { position:absolute; background:#0f172a; color:#e2e8f0; padding:10px 14px; border-radius:10px; font-size:13px; pointer-events:none; z-index:100; min-width:140px; box-shadow:0 10px 25px rgba(0,0,0,.15); }
    .tooltip-header { font-weight:600; margin-bottom:6px; font-size:14px; }
    .tooltip-row { display:flex; gap:6px; margin-top:3px; }
    .tooltip-key { color:#64748b; } .tooltip-val { color:#22c55e; }

    /* FAB */
    .crud-fab { position:fixed; bottom:24px; right:24px; display:flex; flex-direction:column; gap:8px; z-index:50; }
    .fab-btn { width:44px; height:44px; border-radius:12px; border:none; background:#0f172a; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,.2); transition:all .15s; }
    .fab-btn:hover { background:#22c55e; transform:scale(1.1); }

    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(2px); }
    .modal { background:#fff; border-radius:16px; width:90%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 25px 50px rgba(0,0,0,.2); }
    .modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 0; }
    .modal-header h3 { margin:0; font-size:16px; font-weight:600; color:#0f172a; }
    .modal-close { background:none; border:none; font-size:24px; color:#94a3b8; cursor:pointer; padding:0; line-height:1; }
    .modal-close:hover { color:#0f172a; }
    .modal-body { padding:16px 24px 20px; }
    .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:0 24px 20px; }
    .form-group { margin-bottom:14px; }
    .form-group label { display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:4px; }
    .form-group input, .form-group textarea, .form-group select { width:100%; padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; color:#0f172a; background:#f8fafc; outline:none; box-sizing:border-box; font-family:inherit; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.12); background:#fff; }
    .checkbox-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#475569; cursor:pointer; margin-top:8px; }
    .checkbox-row input { width:auto; }
    .confirm-text { font-size:13px; color:#64748b; margin:0 0 12px; }
    .btn-primary { padding:9px 20px; border:none; border-radius:8px; background:#22c55e; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s; }
    .btn-primary:hover:not(:disabled) { opacity:.85; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .btn-secondary { padding:9px 20px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; color:#475569; font-size:13px; cursor:pointer; transition:all .15s; }
    .btn-secondary:hover { background:#f8fafc; }
    .btn-danger { padding:9px 20px; border:none; border-radius:8px; background:#ef4444; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s; }
    .btn-danger:hover:not(:disabled) { opacity:.85; }
    .btn-danger:disabled { opacity:.5; cursor:not-allowed; }
    .result-pre { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:12px; white-space:pre-wrap; max-height:300px; overflow-y:auto; color:#0f172a; }
  `]
})
export class GraphComponent implements OnInit, OnDestroy {
  private graphService = inject(GraphService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('graphContainer', { static: true }) containerRef!: ElementRef;
  @ViewChild('svgElement', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  searchQuery = '';
  selectedLabel = '';
  labels = signal<string[]>([]);
  nodes = signal<GraphNode[]>([]);
  edges = signal<GraphEdge[]>([]);
  isLoading = signal(false);
  error = signal('');
  crudLoading = signal(false);
  showResult = signal(false);
  result = signal({ title: '', message: '' });

  showCreateEntity = false;
  showEditEntity = false;
  showDeleteEntity = false;
  showCreateRelation = false;
  showDeleteRelation = false;
  showMergeEntities = false;

  entityForm = { name: '', type: '', description: '', allowRename: false, allowMerge: false };
  relationForm = { source: '', target: '', description: '', keywords: '', weight: 1 };
  mergeForm = { sources: '', target: '' };

  tooltip = signal<{ visible: boolean; x: number; y: number; label: string; type?: string; degree?: number }>(
    { visible: false, x: 0, y: 0, label: '' }
  );

  private simulation: d3.Simulation<D3Node, D3Link> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() { afterNextRender(() => this.setupResizeObserver()); }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) { this.router.navigate(['/login']); return; }
    this.loadLabels();
  }
  ngOnDestroy(): void { this.simulation?.stop(); this.resizeObserver?.disconnect(); }

  private async loadLabels(): Promise<void> {
    try {
      const data = await firstValueFrom(this.graphService.getPopularLabels(300));
      this.labels.set(data);
      if (data.length > 0) { this.selectedLabel = data[0]; this.loadGraph(); }
    } catch { this.error.set('Failed to load labels'); }
  }

  onSearch(): void {}

  async loadGraph(): Promise<void> {
    if (!this.selectedLabel) return;
    this.isLoading.set(true); this.error.set('');
    try {
      const data = await firstValueFrom(this.graphService.getKnowledgeGraph(this.selectedLabel, 3, 500));
      this.nodes.set(data.nodes || []); this.edges.set(data.edges || []);
      this.renderGraph();
    } catch { this.error.set('Failed to load graph. Check server connection.'); }
    finally { this.isLoading.set(false); }
  }

  resetZoom(): void {
    const svg = d3.select(this.svgRef.nativeElement);
    svg.select('g').transition().duration(500).attr('transform', 'translate(0,0) scale(1)');
  }

  // ─── Entity CRUD ───

  async createEntity(): Promise<void> {
    if (!this.entityForm.name) return;
    this.crudLoading.set(true);
    try {
      const data: Record<string, any> = {};
      if (this.entityForm.type) data['entity_type'] = this.entityForm.type;
      if (this.entityForm.description) data['description'] = this.entityForm.description;
      const res = await firstValueFrom(this.graphService.createEntity({ entity_name: this.entityForm.name, entity_data: data }));
      this.result.set({ title: 'Entity Created', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showCreateEntity = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to create entity' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  async editEntity(): Promise<void> {
    if (!this.entityForm.name) return;
    this.crudLoading.set(true);
    try {
      const data: Record<string, any> = {};
      if (this.entityForm.type) data['entity_type'] = this.entityForm.type;
      if (this.entityForm.description) data['description'] = this.entityForm.description;
      const res = await firstValueFrom(this.graphService.updateEntity(this.entityForm.name, data, this.entityForm.allowRename, this.entityForm.allowMerge));
      this.result.set({ title: 'Entity Updated', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showEditEntity = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to update entity' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  async deleteEntity(): Promise<void> {
    if (!this.entityForm.name) return;
    this.crudLoading.set(true);
    try {
      const res = await firstValueFrom(this.graphService.deleteEntity(this.entityForm.name));
      this.result.set({ title: 'Entity Deleted', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showDeleteEntity = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to delete entity' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  // ─── Relation CRUD ───

  async createRelation(): Promise<void> {
    if (!this.relationForm.source || !this.relationForm.target) return;
    this.crudLoading.set(true);
    try {
      const data: Record<string, any> = {};
      if (this.relationForm.description) data['description'] = this.relationForm.description;
      if (this.relationForm.keywords) data['keywords'] = this.relationForm.keywords;
      if (this.relationForm.weight) data['weight'] = this.relationForm.weight;
      const res = await firstValueFrom(this.graphService.createRelation({
        source_entity: this.relationForm.source,
        target_entity: this.relationForm.target,
        relation_data: data
      }));
      this.result.set({ title: 'Relation Created', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showCreateRelation = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to create relation' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  async deleteRelation(): Promise<void> {
    if (!this.relationForm.source || !this.relationForm.target) return;
    this.crudLoading.set(true);
    try {
      const res = await firstValueFrom(this.graphService.deleteRelation(this.relationForm.source, this.relationForm.target));
      this.result.set({ title: 'Relation Deleted', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showDeleteRelation = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to delete relation' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  // ─── Merge ───

  async mergeEntities(): Promise<void> {
    const sources = this.mergeForm.sources.split(',').map(s => s.trim()).filter(Boolean);
    if (!sources.length || !this.mergeForm.target) return;
    this.crudLoading.set(true);
    try {
      const res = await firstValueFrom(this.graphService.mergeEntities(sources, this.mergeForm.target));
      this.result.set({ title: 'Entities Merged', message: JSON.stringify(res, null, 2) });
      this.showResult.set(true); this.showMergeEntities = false; this.loadGraph();
    } catch (e: any) { this.result.set({ title: 'Error', message: e?.error?.detail || e?.message || 'Failed to merge entities' }); this.showResult.set(true); }
    finally { this.crudLoading.set(false); }
  }

  // ─── D3 Rendering ───

  private renderGraph(): void {
    const container = this.containerRef.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const cx = width / 2, cy = height / 2;
    const svg = d3.select(this.svgRef.nativeElement);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const graphNodes: D3Node[] = this.nodes().map((n, i) => ({ id: n.id, label: n.label || n.id, entity_type: n.entity_type, degree: n.degree, x: cx + (Math.random() - .5) * 40, y: cy + (Math.random() - .5) * 40 }));
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));
    const graphLinks: D3Link[] = this.edges().filter(e => nodeMap.has(e.source) && nodeMap.has(e.target)).map(e => ({ source: e.source, target: e.target, description: e.description, weight: e.weight || 1 }));

    const colorTypes = [...new Set(graphNodes.map(n => n.entity_type || 'default'))];
    const colorScale = d3.scaleOrdinal<string>().domain(colorTypes).range(d3.schemeSet2);

    const link = g.append('g').selectAll('line').data(graphLinks).join('line').attr('stroke', '#cbd5e1').attr('stroke-width', d => Math.max(1, Math.min(4, (d.weight || 1) * 1.5))).attr('stroke-opacity', .6);
    const nodeGroup = g.append('g').selectAll('g').data(graphNodes).join('g').style('cursor', 'pointer');
    nodeGroup.append('circle').attr('r', d => Math.max(6, Math.min(20, (d.degree || 1) * 2))).attr('fill', d => colorScale(d.entity_type || 'default')).attr('stroke', '#fff').attr('stroke-width', 2);
    nodeGroup.append('text').text(d => d.label.length > 15 ? d.label.substring(0, 14) + '…' : d.label).attr('dx', 0).attr('dy', d => Math.max(6, Math.min(20, (d.degree || 1) * 2)) + 14).attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', '#475569').attr('font-family', 'inherit');

    nodeGroup.on('mouseenter', (event: MouseEvent, d: D3Node) => {
      const rect = container.getBoundingClientRect();
      this.tooltip.set({ visible: true, x: event.clientX - rect.left + 12, y: event.clientY - rect.top - 10, label: d.label, type: d.entity_type, degree: d.degree });
      d3.select(event.currentTarget as SVGGElement).select('circle').attr('stroke', '#22c55e').attr('stroke-width', 3);
    }).on('mousemove', (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      this.tooltip.update(t => ({ ...t, x: event.clientX - rect.left + 12, y: event.clientY - rect.top - 10 }));
    }).on('mouseleave', (event: MouseEvent) => {
      this.tooltip.set({ visible: false, x: 0, y: 0, label: '' });
      d3.select(event.currentTarget as SVGGElement).select('circle').attr('stroke', '#fff').attr('stroke-width', 2);
    });

    const drag = d3.drag<SVGGElement, D3Node>().on('start', (event, d) => { if (!event.active) this.simulation?.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; }).on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; }).on('end', (event, d) => { if (!event.active) this.simulation?.alphaTarget(0); d.fx = null; d.fy = null; });
    nodeGroup.call(drag as any);

    this.simulation?.stop();
    this.simulation = d3.forceSimulation<D3Node>(graphNodes).force('link', d3.forceLink<D3Node, D3Link>(graphLinks).id(d => d.id).distance(80)).force('charge', d3.forceManyBody().strength(-300)).force('center', d3.forceCenter(cx, cy)).force('collision', d3.forceCollide().radius(30)).alphaDecay(0.02);

    let tickCount = 0;
    this.simulation.on('tick', () => {
      tickCount++;
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y).attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      if (tickCount === 1) svg.call(zoom.transform, d3.zoomIdentity.translate(cx, cy).scale(.6));
    });
    this.simulation.on('end', () => {
      const bounds = (g.node() as SVGGElement).getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        const scale = Math.min(width / (bounds.width + 80), height / (bounds.height + 80), 1.5);
        const tx = cx - (bounds.x + bounds.width / 2) * scale;
        const ty = cy - (bounds.y + bounds.height / 2) * scale;
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    });
  }

  private setupResizeObserver(): void {
    const container = this.containerRef.nativeElement as HTMLElement;
    this.resizeObserver = new ResizeObserver(() => { if (this.nodes().length > 0) this.renderGraph(); });
    this.resizeObserver.observe(container);
  }
}
