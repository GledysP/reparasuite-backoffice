import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NgFor } from '@angular/common'; // NgIf eliminado
import { debounceTime, switchMap, filter, of } from 'rxjs';
import { ClientesService } from '../../clientes/clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';

@Component({
  standalone: true,
  imports: [
    NgFor, ReactiveFormsModule, MatDialogModule, 
    MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatIconModule
  ],
template: `
    <div class="rs-modal-frame">
      <div class="rs-modal-header">
        <h2 class="rs-modal-title">Buscar Cliente Existente</h2>
        <p class="rs-modal-subtitle">Filtra por nombre, teléfono o correo electrónico</p>
      </div>

      <mat-dialog-content class="rs-modal-body">
        <mat-form-field appearance="outline" class="rs-search-input">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" placeholder="Escribe para buscar..." autofocus>
        </mat-form-field>

        @if (resultados.length > 0) {
          <div class="rs-results-list">
            <mat-selection-list [multiple]="false" (selectionChange)="seleccionar($event.options[0].value)">
              <mat-list-option *ngFor="let c of resultados" [value]="c">
                <div class="rs-client-row">
                  <span class="name">{{ c.nombre }}</span>
                  <span class="meta">{{ c.telefono }} • {{ c.email }}</span>
                </div>
              </mat-list-option>
            </mat-selection-list>
          </div>
        }
      </mat-dialog-content>
      
      <mat-dialog-actions class="rs-modal-actions">
        <button mat-stroked-button mat-dialog-close class="rs-btn-secondary">
          Cancelar
        </button>
        <button mat-flat-button class="rs-btn--primary" (click)="confirmar()">
          <span class="rs-btn__label">Seleccionar Cliente</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .rs-modal-frame { background: var(--rs-card); border-radius: 16px; overflow: hidden; }
    .rs-modal-header { padding: 32px 32px 8px; } /* Alineación exacta con el input */
    .rs-modal-title { margin: 0; font-weight: 700; font-size: 22px; color: var(--rs-text-navy); }
    .rs-modal-subtitle { margin: 6px 0 0; font-size: 14px; color: var(--rs-text-muted); }
    .rs-modal-body { padding: 16px 32px 24px !important; }
    .rs-search-input { width: 100%; }
    .rs-results-list { 
      margin-top: 12px; max-height: 200px; overflow-y: auto; 
      border: 1px solid var(--rs-border); border-radius: 12px;
    }
    .rs-client-row { display: flex; flex-direction: column; padding: 4px 0; }
    .rs-client-row .name { font-weight: 600; color: var(--rs-text-navy); }
    .rs-client-row .meta { font-size: 12px; color: var(--rs-text-muted); }
    .rs-modal-actions { padding: 16px 32px 24px !important; gap: 12px; justify-content: flex-end; }
  `]
})


export class ClienteBuscarDialogComponent {
  private dialogRef = inject(MatDialogRef<ClienteBuscarDialogComponent>);
  private clientesService = inject(ClientesService);
  
  searchControl = new FormControl('');
  resultados: ClienteResumen[] = [];
  clienteSeleccionado: ClienteResumen | null = null;

  constructor() {
    this.searchControl.valueChanges.pipe(
      filter(v => (v?.length ?? 0) > 1),
      debounceTime(300),
      switchMap(v => this.clientesService.listar(v!).pipe(
        switchMap(res => of(res.items))
      ))
    ).subscribe(res => this.resultados = res);
  }

  seleccionar(cliente: ClienteResumen) {
    this.clienteSeleccionado = cliente;
  }

  confirmar() {
    this.dialogRef.close(this.clienteSeleccionado);
  }
}