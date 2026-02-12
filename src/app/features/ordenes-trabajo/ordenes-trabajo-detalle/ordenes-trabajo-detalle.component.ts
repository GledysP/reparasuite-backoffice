import { Component, OnInit, inject, TemplateRef, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';

// Imports de Angular Material necesarios para tu HTML
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 

import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { EstadoOt } from '../../../core/models/enums';
import { OtDetalle } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-detalle',
  standalone: true,
  imports: [
    DatePipe, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatButtonModule, MatSnackBarModule, MatIconModule,
    MatDialogModule 
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild('imageModal') imageModal!: TemplateRef<any>;

  // Signal para la data principal
  ot = signal<OtDetalle | null>(null);
  selectedImageUrl = signal<string>('');
  
  id = this.route.snapshot.paramMap.get('id')!;
  estados: EstadoOt[] = ['RECIBIDA','PRESUPUESTO','APROBADA','EN_CURSO','FINALIZADA','CERRADA'];

  // Formulario para el cambio de estado
  formEstado = this.fb.group({
    a: [null as EstadoOt | null, Validators.required]
  });

  // Formulario para las notas
  formNota = this.fb.group({
    contenido: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.ordenes.obtener(this.id).subscribe({
      next: (res) => {
        this.ot.set(res);
        if (res.estado) {
          this.formEstado.controls.a.setValue(res.estado);
        }
      },
      error: () => this.snack.open('Error al cargar la orden', 'OK', { duration: 2500 }),
    });
  }

  cambiarEstado(nuevo?: EstadoOt): void {
    const estadoFinal = nuevo || this.formEstado.controls.a.value;
    if (!estadoFinal) return;

    this.ordenes.cambiarEstado(this.id, estadoFinal).subscribe({
      next: () => { 
        this.snack.open('Estado actualizado', 'OK', { duration: 2000 }); 
        this.cargar(); 
      },
      error: () => this.snack.open('Error al actualizar', 'OK', { duration: 2500 })
    });
  }

  anadirNota(): void {
    if (this.formNota.invalid) return;
    const contenido = this.formNota.controls.contenido.value!;
    this.ordenes.anadirNota(this.id, contenido).subscribe({
      next: () => { 
        this.formNota.reset(); 
        this.snack.open('Nota añadida', 'OK', { duration: 2000 }); 
        this.cargar(); 
      },
      error: () => this.snack.open('Error al añadir nota', 'OK', { duration: 2500 }),
    });
  }

  verFoto(foto: any): void {
    // Soportamos si viene el objeto FotoOt o solo el string
    const url = foto?.url || foto;
    this.selectedImageUrl.set(url);
    this.dialog.open(this.imageModal, { width: 'auto', maxWidth: '90vw' });
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.ordenes.subirFoto(this.id, file).subscribe({
        next: () => { 
          this.snack.open('Foto subida', 'OK', { duration: 2000 }); 
          this.cargar(); 
        },
        error: () => this.snack.open('Error al subir foto', 'OK', { duration: 2500 }),
      });
    }
    input.value = '';
  }
}