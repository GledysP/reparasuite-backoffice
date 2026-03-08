import { Component, ElementRef, Inject, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

type CmdAction =
  | { type: 'route'; label: string; icon: string; route: string }
  | { type: 'logout'; label: string; icon: string };

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatIconModule, MatListModule, MatButtonModule],
  template: `
    <div class="rs-cmdk">
      <div class="rs-cmdk-header">
        <div class="rs-cmdk-mark">
          <mat-icon fontSet="material-symbols-outlined">bolt</mat-icon>
        </div>

        <div class="rs-cmdk-meta">
          <div class="rs-cmdk-title">Búsqueda rápida</div>
          <div class="rs-cmdk-sub">Navega al instante (Ctrl K)</div>
        </div>

        <div class="rs-cmdk-kbd">Ctrl K</div>
      </div>

      <mat-form-field appearance="outline" class="rs-cmdk-search" subscriptSizing="dynamic">
        <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
        <input
          #searchInput
          matInput
          placeholder="Ir a… (Panel, Tickets, Clientes…)"
          (input)="onQuery($any($event.target).value)"
          (keydown)="onKeydown($event)"
        />
        <button mat-icon-button matSuffix type="button" aria-label="Cerrar" (click)="close()" class="rs-cmdk-close">
          <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
        </button>
      </mat-form-field>

      <div class="rs-cmdk-list" (keydown)="onKeydown($event)" tabindex="0">
        <mat-nav-list>
          <button
            mat-list-item
            type="button"
            class="rs-cmdk-item"
            *ngFor="let a of filtered; let i = index"
            (click)="run(a)"
            [class.is-active]="i === activeIndex"
          >
            <mat-icon matListItemIcon fontSet="material-symbols-outlined">{{ a.icon }}</mat-icon>
            <span matListItemTitle>{{ a.label }}</span>
            <mat-icon class="rs-cmdk-go" fontSet="material-symbols-outlined">arrow_right_alt</mat-icon>
          </button>
        </mat-nav-list>

        <div class="rs-cmdk-empty" *ngIf="filtered.length === 0">No hay resultados.</div>
      </div>

      <div class="rs-cmdk-footer">
        <span>↑ ↓</span><span>Enter</span><span>Esc</span>
      </div>
    </div>
  `,
  styles: [`
    .rs-cmdk { padding:16px 16px 12px; }
    .rs-cmdk-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    .rs-cmdk-mark { width:36px; height:36px; border-radius:12px; display:grid; place-items:center; background:rgba(18,78,89,.08); color:#124E59; }
    .rs-cmdk-meta { display:flex; flex-direction:column; line-height:1.1; }
    .rs-cmdk-title { font-weight:950; color:#0f172a; font-size:14px; }
    .rs-cmdk-sub { font-weight:800; color:#64748b; font-size:12px; margin-top:2px; }
    .rs-cmdk-kbd { margin-left:auto; font-size:12px; font-weight:950; color:#64748b; border:1px solid rgba(226,232,240,.95); background:#fff; padding:6px 10px; border-radius:10px; }

    .rs-cmdk-search {
      width:100%; margin:0 !important;
      --mdc-outlined-text-field-outline-color: rgba(226,232,240,1);
      --mdc-outlined-text-field-hover-outline-color: rgba(148,163,184,.92);
      --mdc-outlined-text-field-focus-outline-color: #124E59;
      --mdc-outlined-text-field-container-shape: 12px;
    }
    .rs-cmdk-search .mat-mdc-form-field-subscript-wrapper { display:none !important; }
    .rs-cmdk-search .mdc-notched-outline__leading,
    .rs-cmdk-search .mdc-notched-outline__notch,
    .rs-cmdk-search .mdc-notched-outline__trailing { border-width:1px !important; }

    .rs-cmdk-close.mat-mdc-icon-button { border-radius:10px; --mdc-icon-button-state-layer-color: transparent; }
    .rs-cmdk-close:hover { background: rgba(15,23,42,0.06) !important; }

    .rs-cmdk-list { margin-top:10px; max-height:340px; overflow:auto; border-radius:14px; }
    .rs-cmdk-item { border-radius:12px !important; margin:4px 0 !important; background:#fff !important; border:1px solid rgba(226,232,240,.95); }
    .rs-cmdk-item:hover { background: rgba(18,78,89,0.06) !important; border-color: rgba(18,78,89,0.18) !important; }
    .rs-cmdk-item.is-active { background: rgba(18,78,89,0.12) !important; border-color: rgba(18,78,89,0.22) !important; }
    .rs-cmdk-go { margin-left:auto; color: rgba(100,116,139,.9); }
    .rs-cmdk-empty { padding:14px 10px; color:#64748b; font-weight:800; font-size:13px; }
    .rs-cmdk-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:12px; color:#64748b; font-weight:900; font-size:12px; }
    .rs-cmdk-footer span { border:1px solid rgba(226,232,240,.95); background:#fff; padding:6px 10px; border-radius:10px; }
  `],
})
export class CommandPaletteDialogComponent {
  private dialogRef = inject(MatDialogRef<CommandPaletteDialogComponent>);
  private router = inject(Router);
  private auth = inject(AuthService);

  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;

  actions: CmdAction[] = [];
  filtered: CmdAction[] = [];
  activeIndex = 0;

  constructor(@Inject(MAT_DIALOG_DATA) data: { navItems: NavItem[] }) {
    const navActions: CmdAction[] = data.navItems.map((n) => ({
      type: 'route',
      label: n.label,
      icon: n.icon,
      route: n.route,
    }));
    const extra: CmdAction[] = [{ type: 'logout', label: 'Cerrar sesión', icon: 'logout' }];

    this.actions = [...navActions, ...extra];
    this.filtered = [...this.actions];

    queueMicrotask(() => this.searchInput.nativeElement.focus());
  }

  onQuery(q: string): void {
    const query = (q ?? '').trim().toLowerCase();
    this.filtered = !query ? [...this.actions] : this.actions.filter((a) => a.label.toLowerCase().includes(query));
    this.activeIndex = 0;
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex = Math.max(this.activeIndex - 1, 0); return; }
    if (e.key === 'Enter') { e.preventDefault(); const action = this.filtered[this.activeIndex]; if (action) this.run(action); return; }
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
  }

  run(action: CmdAction): void {
    if (action.type === 'route') { this.dialogRef.close(); this.router.navigateByUrl(action.route); return; }
    if (action.type === 'logout') { this.dialogRef.close(); this.auth.logout(); this.router.navigateByUrl('/login'); }
  }

  close(): void { this.dialogRef.close(); }
}