import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; 
import { InventarioService } from '../inventario.service';
import { InventarioCategoriaDto } from '../../../core/models/tipos'; 

@Component({
  selector: 'app-inventario-categoria-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, 
    MatFormFieldModule, MatInputModule, MatIconModule, MatSnackBarModule
  ],
  template: `
    <div class="rs-dialog">
      <div class="rs-dialog__header">
        <h2 class="rs-dialog__title">Nueva Categoría</h2>
        <p class="rs-dialog__subtitle">Organiza tus repuestos por familias tecnológicas.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="rs-dialog__body">
          <mat-form-field appearance="outline" class="rs-full-width">
            <mat-label>Nombre de la categoría</mat-label>
            <input matInput formControlName="nombre" placeholder="Ej: Pantallas, Baterías...">
          </mat-form-field>

          <mat-form-field appearance="outline" class="rs-full-width">
            <mat-label>Descripción (Opcional)</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>
        </div>

        <div class="rs-dialog__actions">
          <button mat-button type="button" (click)="ref.close()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Guardando...' : 'Crear Categoría' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .rs-dialog { padding: 12px; }
    .rs-dialog__header { margin-bottom: 20px; }
    .rs-dialog__title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #081a4b; }
    .rs-dialog__subtitle { margin: 4px 0 0; color: #64748b; font-size: 13px; }
    .rs-dialog__body { display: flex; flex-direction: column; gap: 8px; }
    .rs-dialog__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
    .rs-full-width { width: 100%; }
  `]
})
export class InventarioCategoriaDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(InventarioService);
  private snack = inject(MatSnackBar); 
  public ref = inject(MatDialogRef<InventarioCategoriaDialogComponent>);
  loading = false;

  form = this.fb.group({
    nombre: ['', Validators.required],
    description: ['']
  });

  guardar() {
    if (this.form.invalid) return;
    this.loading = true;
    
    const nombre = this.form.value.nombre!;
    const codigo = nombre.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);

    const payload = {
      nombre: nombre,
      descripcion: this.form.value.description || '',
      codigo: codigo
    };

    this.service.crearCategoria(payload as any).subscribe({
      next: (res: InventarioCategoriaDto) => { 
        this.ref.close(res);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al crear la categoría.', 'OK', { duration: 2500 });
      }
    });
  }
}