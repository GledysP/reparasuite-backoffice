import { Component, OnInit, inject, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf, DatePipe } from '@angular/common';

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

@Component({
  selector: 'rs-ordenes-trabajo-detalle',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, RouterLink, ReactiveFormsModule,
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

  id!: string;
  ot: any = null;
  selectedImageUrl: string = '';
  estados: EstadoOt[] = ['RECIBIDA','PRESUPUESTO','APROBADA','EN_CURSO','FINALIZADA','CERRADA'];

  formEstado = this.fb.group({ a: ['RECIBIDA' as EstadoOt, Validators.required] });
  formNota = this.fb.group({ contenido: ['', [Validators.required]] });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
  }

  cargar() {
    this.ordenes.obtener(this.id).subscribe({
      next: (ot) => {
        this.ot = ot;
        if (ot.estado) this.formEstado.controls.a.setValue(ot.estado);
      },
      error: () => this.snack.open('Error loading order', 'OK', { duration: 2500 }),
    });
  }

  cambiarEstado(nuevo?: EstadoOt) {
    const estadoFinal = nuevo || this.formEstado.controls.a.value!;
    console.log('Intentando cambiar estado a:', estadoFinal); // Para debug
    
    this.ordenes.cambiarEstado(this.id, estadoFinal).subscribe({
      next: () => { 
        this.snack.open('Status updated', 'OK', { duration: 2000 }); 
        this.cargar(); 
      },
      error: (err) => {
        console.error('Error en la petición:', err);
        this.snack.open('Error updating status', 'OK', { duration: 2500 });
      }
    });
  }

  verFoto(foto: any) {
    this.selectedImageUrl = foto?.url || foto;
    this.dialog.open(this.imageModal, {
      width: 'auto',
      maxWidth: '90vw',
      panelClass: 'custom-modal-box'
    });
  }

  anadirNota() {
    if (this.formNota.invalid) return;
    const contenido = this.formNota.getRawValue().contenido!;
    this.ordenes.anadirNota(this.id, contenido).subscribe({
      next: () => { 
        this.formNota.reset(); 
        this.snack.open('Note added', 'OK', { duration: 2000 }); 
        this.cargar(); 
      },
      error: () => this.snack.open('Error adding note', 'OK', { duration: 2500 }),
    });
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.ordenes.subirFoto(this.id, file).subscribe({
        next: () => { 
          this.snack.open('Photo uploaded', 'OK', { duration: 2000 }); 
          this.cargar(); 
        },
        error: () => this.snack.open('Error uploading photo', 'OK', { duration: 2500 }),
      });
    }
    input.value = '';
  }

  copyToClipboard(text: string | undefined) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.snack.open('Copied to clipboard', 'OK', { duration: 1500 });
    });
  }
}