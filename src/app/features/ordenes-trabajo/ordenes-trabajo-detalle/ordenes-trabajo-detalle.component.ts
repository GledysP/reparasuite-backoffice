import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { EstadoOt } from '../../../core/models/enums';
import { OtDetalle } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-detalle',
  standalone: true,
  imports: [
    NgIf, NgFor,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule, MatChipsModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatButtonModule, MatListModule, MatSnackBarModule,
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  id!: string;
  ot: OtDetalle | null = null;

  estados: EstadoOt[] = ['RECIBIDA','PRESUPUESTO','APROBADA','EN_CURSO','FINALIZADA','CERRADA'];

  formEstado = this.fb.group({
    a: ['RECIBIDA' as EstadoOt, Validators.required]
  });

  formNota = this.fb.group({
    contenido: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
  }

  cargar() {
    this.ordenes.obtener(this.id).subscribe({
      next: (ot) => {
        this.ot = ot;
        this.formEstado.patchValue({ a: ot.estado });
      },
      error: () => this.snack.open('OT no encontrada', 'OK', { duration: 2500 }),
    });
  }

  cambiarEstado() {
    if (this.formEstado.invalid) return;
    const a = this.formEstado.getRawValue().a!;
    this.ordenes.cambiarEstado(this.id, a).subscribe({
      next: () => { this.snack.open('Estado actualizado', 'OK', { duration: 2000 }); this.cargar(); },
      error: () => this.snack.open('Error cambiando estado', 'OK', { duration: 2500 }),
    });
  }

  anadirNota() {
    if (this.formNota.invalid) return;
    const contenido = this.formNota.getRawValue().contenido!;
    this.ordenes.anadirNota(this.id, contenido).subscribe({
      next: () => { this.formNota.reset({ contenido: '' }); this.snack.open('Nota añadida', 'OK', { duration: 2000 }); this.cargar(); },
      error: () => this.snack.open('Error añadiendo nota', 'OK', { duration: 2500 }),
    });
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.ordenes.subirFoto(this.id, file).subscribe({
      next: () => { this.snack.open('Foto subida', 'OK', { duration: 2000 }); this.cargar(); },
      error: () => this.snack.open('Error subiendo foto', 'OK', { duration: 2500 }),
    });

    input.value = '';
  }
}
