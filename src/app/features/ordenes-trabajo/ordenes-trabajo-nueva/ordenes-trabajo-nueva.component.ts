import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, startWith, map } from 'rxjs/operators';

import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import { UsuarioResumen, ClienteResumen } from '../../../core/models/tipos';

import { ClienteBuscarDialogComponent } from './cliente-buscar-dialog.component';

type FotoPreview = { file: File; url: string; name: string; size: number };

@Component({
  selector: 'rs-ordenes-trabajo-nueva',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatRadioModule, MatSelectModule, MatButtonModule,
    MatSnackBarModule, MatIconModule, MatDialogModule,
    MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatAutocompleteModule
  ],
  templateUrl: './ordenes-trabajo-nueva.component.html',
  styleUrl: './ordenes-trabajo-nueva.component.scss',
})
export class OrdenesTrabajoNuevaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuarios = inject(UsuariosService);
  private ordenes = inject(OrdenesTrabajoService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  tecnicos: UsuarioResumen[] = [];
  tecnicosFiltrados: UsuarioResumen[] = [];
  prioridades: PrioridadOt[] = ['BAJA', 'MEDIA', 'ALTA'];

  clienteId: string | null = null;

  fotos: File[] = [];
  fotoPreviews: FotoPreview[] = [];
  isDragOver = false;

  // Autocomplete
  tecnicoQuery = new FormControl<string>('', { nonNullable: true });

  form = this.fb.group({
    clienteNombre: ['', [Validators.required]],
    clienteTelefono: [''],
    clienteEmail: [''],

    tipo: ['TIENDA' as TipoOt, [Validators.required]],
    direccion: [''],
    notasAcceso: [''],
    // ✅ separar fechas para evitar “duplicado” entre domicilio y programada
    fechaPrevistaDomicilio: [null as Date | null],
    fechaProgramada: [null as Date | null],

    descripcion: ['', [Validators.required]],
    prioridad: new FormControl<PrioridadOt>('MEDIA', { nonNullable: true }),
    tecnicoId: [null as string | null],
  });

  ngOnInit(): void {
    this.usuarios.listar(true).subscribe(u => {
      this.tecnicos = u.filter(x => x.rol === 'TECNICO');
      this.setupTecnicoFilter();
    });
  }

  private setupTecnicoFilter() {
    this.tecnicoQuery.valueChanges.pipe(
      startWith(''),
      map(v => (v || '').toLowerCase().trim()),
      map(q => this.tecnicos.filter(t => (t.nombre || '').toLowerCase().includes(q)))
    ).subscribe(list => {
      this.tecnicosFiltrados = list;
    });
  }

  onTecnicoSelected(value: UsuarioResumen | null) {
    if (!value) {
      this.form.controls.tecnicoId.setValue(null);
      this.tecnicoQuery.setValue('');
      return;
    }
    this.form.controls.tecnicoId.setValue(value.id);
    this.tecnicoQuery.setValue(value.nombre);
  }

  get selectedFileName(): string | null {
    if (this.fotos.length === 0) return null;
    return this.fotos.length === 1 ? this.fotos[0].name : `${this.fotos.length} archivos seleccionados`;
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = false;
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = false;
    const files = ev.dataTransfer?.files;
    if (files && files.length) {
      this.setFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.setFiles(Array.from(files));
    }
    // permite volver a seleccionar el mismo archivo
    input.value = '';
  }

  private setFiles(files: File[]) {
    const onlyImages = files.filter(f => f.type.startsWith('image/'));
    if (!onlyImages.length) {
      this.snack.open('Selecciona imágenes válidas', 'OK', { duration: 2000 });
      return;
    }

    // reemplaza lista completa (si quieres “append”, lo cambiamos)
    this.clearPreviews();
    this.fotos = onlyImages;
    this.fotoPreviews = onlyImages.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    this.snack.open(`${this.fotos.length} foto(s) lista(s)`, 'OK', { duration: 2000 });
  }

  removeFile(index: number) {
    const prev = this.fotoPreviews[index];
    if (prev?.url) URL.revokeObjectURL(prev.url);

    this.fotoPreviews = this.fotoPreviews.filter((_, i) => i !== index);
    this.fotos = this.fotos.filter((_, i) => i !== index);
  }

  clearPreviews() {
    this.fotoPreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.fotoPreviews = [];
  }

  clearFiles() {
    this.clearPreviews();
    this.fotos = [];
  }

  buscarCliente() {
    const dialogRef = this.dialog.open(ClienteBuscarDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      panelClass: 'rs-dialog-custom'
    });

    dialogRef.afterClosed().subscribe((cliente: ClienteResumen) => {
      if (cliente) {
        this.clienteId = cliente.id;
        this.form.patchValue({
          clienteNombre: cliente.nombre,
          clienteTelefono: cliente.telefono,
          clienteEmail: cliente.email
        });
      }
    });
  }

  crear() {
    if (this.form.invalid) {
      this.snack.open('Por favor revisa los campos requeridos', 'OK', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();

    // regla: si es DOMICILIO usamos fechaPrevistaDomicilio; si no, fechaProgramada
    const fechaFinal =
      v.tipo === 'DOMICILIO'
        ? v.fechaPrevistaDomicilio
        : v.fechaProgramada;

    const body = {
      cliente: {
        id: this.clienteId,
        nombre: v.clienteNombre?.trim(),
        telefono: v.clienteTelefono?.trim() || null,
        email: v.clienteEmail?.trim() || null,
      },
      tipo: v.tipo,
      prioridad: v.prioridad,
      descripcion: v.descripcion?.trim(),
      tecnicoId: v.tecnicoId || null,
      fechaPrevista: fechaFinal ? new Date(fechaFinal).toISOString() : null,
      direccion: v.tipo === 'DOMICILIO' ? (v.direccion || null) : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? (v.notasAcceso || null) : null,
    };

    this.ordenes.crear(body).pipe(
      switchMap((res: any) => {
        const id = res.id;

        if (!this.fotos.length) return of({ id });

        this.snack.open('Subiendo fotos...', 'OK', { duration: 2000 });

        const uploads = this.fotos.map(file =>
          this.ordenes.subirFoto(id, file).pipe(
            catchError(err => {
              console.error('Error subiendo foto:', err);
              return of(null);
            })
          )
        );

        return forkJoin(uploads).pipe(switchMap(() => of({ id })));
      })
    ).subscribe({
      next: ({ id }) => {
        this.snack.open('¡Orden creada con éxito!', 'Cerrar', { duration: 2500 });
        this.clearFiles();
        this.router.navigate(['/ordenes-trabajo', id]);
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Error al crear la orden', 'OK', { duration: 3000 });
      }
    });
  }

  cancelar() {
    this.clearFiles();
    this.router.navigateByUrl('/ordenes-trabajo');
  }
}
