import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NgIf, NgFor } from '@angular/common';
import { debounceTime, switchMap, filter, of } from 'rxjs';
import { ClientesService } from '../../clientes/clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';

@Component({
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, MatDialogModule, 
    MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title style="font-weight: 700; font-size: 18px;">Find Existing Customer</h2>
    <mat-dialog-content>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
        Search by name, phone, or email
      </p>
      
      <mat-form-field appearance="outline" class="rs-full" style="width: 100%;">
        <input matInput [formControl]="searchControl" placeholder="Type here..." autofocus>
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <mat-selection-list [multiple]="false" (selectionChange)="seleccionar($event.options[0].value)" 
                          style="max-height: 250px; overflow-y: auto;">
        <mat-list-option *ngFor="let c of resultados" [value]="c">
          <div style="display:flex; flex-direction:column; padding: 4px 0;">
            <span style="font-weight: 600; color: #1e293b;">{{ c.nombre }}</span>
            <span style="font-size: 12px; color: #64748b;">{{ c.telefono }} • {{ c.email }}</span>
          </div>
        </mat-list-option>
      </mat-selection-list>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" style="padding: 16px 24px;">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button class="rs-btn-petroleo" [disabled]="!clienteSeleccionado" (click)="confirmar()">
        Select
      </button>
    </mat-dialog-actions>
  `
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