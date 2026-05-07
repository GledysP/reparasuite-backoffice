import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'rs-categoria-equipo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './categoria-equipo-dialog.component.html',
  styleUrl: './categoria-equipo-dialog.component.scss'
})
export class CategoriaEquipoDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoriaEquipoDialogComponent>);
  public readonly data = inject(MAT_DIALOG_DATA);

  saving = false;

  readonly iconosDisponibles = [
    { valor: 'memory', nombre: 'Tarjeta Electrónica' },
    { valor: 'local_laundry_service', nombre: 'Lavadora / Secadora' },
    { valor: 'air_freshener', nombre: 'Aire Acondicionado' },
    { valor: 'laptop_mac', nombre: 'Laptops / Computadoras' },
    { valor: 'tv', nombre: 'Televisores / Monitores' },
    { valor: 'smartphone', nombre: 'Teléfonos / Tablets' },
    { valor: 'videogame_asset', nombre: 'Consolas de Videojuego' },
    { valor: 'kitchen', nombre: 'Electrodomésticos / Cocina' },
    { valor: 'devices_other', nombre: 'Dispositivos (General)' },
    { valor: 'router', nombre: 'Redes y Routers' },
    { valor: 'print', nombre: 'Impresoras / Copiadoras' },
  ];

  form = this.fb.group({
    codigo: [''],
    nombre: ['', Validators.required],
    descripcion: [''],
    icono: ['devices_other'], 
    ordenVisual: [1],
    activa: [true]
  });

  ngOnInit(): void {
    if (this.data && this.data.categoria) {
      this.form.patchValue({
        codigo: this.data.categoria.codigo,
        nombre: this.data.categoria.nombre,
        descripcion: this.data.categoria.descripcion,
        icono: this.data.categoria.icono || 'devices_other',
        ordenVisual: this.data.categoria.ordenVisual || 1,
        activa: this.data.categoria.activa !== false
      });
    }

    this.form.get('nombre')?.valueChanges.subscribe(nombre => {
      if (!this.data?.categoria && nombre) {
        const codigoGenerado = nombre
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .toUpperCase()
          .substring(0, 20); 

        this.form.patchValue({ codigo: codigoGenerado }, { emitEvent: false });
      }
    });
  }

  // Función para mostrar el nombre limpio en el input
  obtenerNombreIcono(valor: string | null | undefined): string {
    if (!valor) return 'Seleccionar...';
    const icon = this.iconosDisponibles.find(i => i.valor === valor);
    return icon ? icon.nombre : 'Seleccionar...';
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formData = this.form.getRawValue();
    
    setTimeout(() => {
      this.dialogRef.close(formData);
      this.saving = false;
    }, 800);
  }
}