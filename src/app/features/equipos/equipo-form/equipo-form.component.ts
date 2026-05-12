import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextFieldModule } from '@angular/cdk/text-field';

import { ClientesService } from '../../clientes/clientes.service';
import { EquiposService } from '../equipos.service';
import { CategoriaEquipoDto, ClienteResumen } from '../../../core/models/tipos';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'rs-equipo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    TextFieldModule
  ],
  templateUrl: './equipo-form.component.html',
  styleUrl: './equipo-form.component.scss'
})
export class EquipoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly equipos = inject(EquiposService);
  private readonly clientes = inject(ClientesService);
  private readonly dialogRef = inject(MatDialogRef<EquipoFormComponent>, { optional: true });
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true });

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  id: string | null = null;
  loading = signal(false);
  isDragOver = signal(false);

  categorias = signal<CategoriaEquipoDto[]>([]);
  clientesItems = signal<ClienteResumen[]>([]);
  filteredClientes = signal<ClienteResumen[]>([]);
  
  // MODIFICADO: Estructura interna para soportar Base64
  selectedFile = signal<{file: File | null, url: string, base64: string} | null>(null);

  clienteSearchCtrl = new FormControl<ClienteResumen | string>('', [Validators.required]);

  form = this.fb.group({
    clienteId: ['', Validators.required],
    categoriaEquipoId: ['', Validators.required],
    codigoInterno: [''],
    tipoEquipo: ['', Validators.required], 
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    numeroSerie: [''], 
    descripcionGeneral: [''],
    fechaCompra: [''],
    garantiaHasta: [''],
    ubicacionHabitual: [''],
    notasTecnicas: [''],
    estadoActivo: [true]
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.cargarCatalogos();
    this.setupClienteAutocomplete();

 // SI ESTAMOS EN MODO MODAL (Viniendo desde la Orden de Trabajo)
    if (this.dialogData && this.dialogData.clienteId) {
      // 1. Asignamos el ID oculto para la BD
      this.form.patchValue({ clienteId: this.dialogData.clienteId });
      
      // 2. MAGIA VISUAL: Le inyectamos el nombre para que no se vea vacío
      if (this.dialogData.clienteNombre) {
        this.clienteSearchCtrl.setValue(this.dialogData.clienteNombre, { emitEvent: false });
      }
      
      // AÑADIMOS emitEvent: false
      this.clienteSearchCtrl.disable({ emitEvent: false });
    }
    if (this.id) {
      this.equipos.obtener(this.id).subscribe({
        next: (equipo: any) => {
          this.form.patchValue({
            clienteId: equipo.clienteId,
            categoriaEquipoId: equipo.categoria?.id ?? '',
            codigoInterno: equipo.codigoInterno ?? '',
            tipoEquipo: equipo.tipoEquipo ?? '',
            marca: equipo.marca ?? '',
            modelo: equipo.modelo ?? '',
            numeroSerie: equipo.numeroSerie ?? '',
            descripcionGeneral: equipo.descripcionGeneral ?? '',
            fechaCompra: equipo.fechaCompra ?? '',
            garantiaHasta: equipo.garantiaHasta ?? '',
            ubicacionHabitual: equipo.ubicacionHabitual ?? '',
            notasTecnicas: equipo.notasTecnicas ?? '',
            estadoActivo: equipo.estadoActivo
          });

          // MODIFICADO: Carga la imagen desde el backend si existe (fotoBase64)
          if (equipo.fotoBase64) {
            this.selectedFile.set({
              file: null,
              url: equipo.fotoBase64,
              base64: equipo.fotoBase64
            });
          }

          this.syncClienteDisplay();
        }
      });
    }
  }

  private setupClienteAutocomplete(): void {
    this.clienteSearchCtrl.valueChanges.subscribe(value => {
      const term =
        typeof value === 'string'
          ? value.toLowerCase().trim()
          : (value?.nombre || '').toLowerCase().trim();

      const filtered = this.clientesItems().filter(cliente => {
        const nombre = (cliente.nombre || '').toLowerCase();
        const email = (cliente.email || '').toLowerCase();
        return nombre.includes(term) || email.includes(term);
      });

      this.filteredClientes.set(filtered);

// Así protegemos el ID cuando el formulario se abre como Modal.
      if (typeof value === 'string' && !this.clienteSearchCtrl.disabled) {
        this.form.patchValue({ clienteId: '' }, { emitEvent: false });
      }
    });
  }

  private cargarCatalogos(): void {
    this.equipos.categorias().subscribe(list => this.categorias.set(list));

    this.clientes.listar('', 0, 100).subscribe(response => {
      this.clientesItems.set(response.items);
      this.filteredClientes.set(response.items);
      this.syncClienteDisplay();
    });
  }

  private syncClienteDisplay(): void {
    const clienteId = this.form.controls.clienteId.value;
    if (!clienteId) return;

    const cliente = this.clientesItems().find(item => item.id === clienteId);
    if (cliente) {
      this.clienteSearchCtrl.setValue(cliente, { emitEvent: false });
    }
  }

  displayCliente = (value: ClienteResumen | string | null): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : value.nombre;
  };

  seleccionarCliente(cliente: ClienteResumen): void {
    this.form.patchValue({ clienteId: cliente.id });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) this.handleFile(files);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files);
    input.value = '';
  }

  // MODIFICADO: Nueva lógica permanente para Base64
  private handleFile(fileList: FileList): void {
    if (fileList.length === 0) return;
    const file = fileList[0];
    
    if (!file.type.startsWith('image/')) {
      this.snack.open('Por favor, selecciona un archivo de imagen (JPG, PNG).', 'OK', { duration: 2500 });
      return;
    }

    const current = this.selectedFile();
    if (current && current.url && current.file) {
      URL.revokeObjectURL(current.url); 
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const url = URL.createObjectURL(file);
      this.selectedFile.set({ file, url, base64 });
    };
    reader.readAsDataURL(file);
  }

  clearFile(event?: Event): void {
    if (event) event.stopPropagation();
    const current = this.selectedFile();
    if (current?.url && current?.file) {
      URL.revokeObjectURL(current.url);
    }
    this.selectedFile.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  getClienteResumen(): string {
    const value = this.clienteSearchCtrl.value;
    if (!value) return '';
    return typeof value === 'string' ? value : value.nombre;
  }

  getEquipoResumen(): string {
    const tipo = this.form.controls.tipoEquipo.value?.trim() || '';
    const marca = this.form.controls.marca.value?.trim() || '';
    const modelo = this.form.controls.modelo.value?.trim() || '';
    return [tipo, marca, modelo].filter(Boolean).join(' · ');
  }

  guardar(): void {
    // MODIFICADO: Validación del cliente (trampa del autocomplete)
    if (!this.form.controls.clienteId.value) {
      this.clienteSearchCtrl.setErrors({ required: true });
      this.snack.open('Error: Debes seleccionar un cliente de la lista desplegable.', 'OK', {
        duration: 4000, panelClass: 'rs-toast-error'
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Por favor, revisa los campos marcados en rojo.', 'OK', {
        duration: 3500, panelClass: 'rs-toast-error'
      });
      return;
    }

    this.loading.set(true);
    const body = this.form.getRawValue();

    const formatearFecha = (fecha: any) => {
      if (!fecha) return null;
      const d = new Date(fecha);
      return d.toISOString().split('T')[0];
    };

    // MODIFICADO: Incluye fotoBase64 en el envío
    const req = {
      clienteId: body.clienteId!,
      categoriaEquipoId: body.categoriaEquipoId || null,
      codigoInterno: body.codigoInterno || null,
      tipoEquipo: body.tipoEquipo || null,
      marca: body.marca || null,
      modelo: body.modelo || null,
      numeroSerie: body.numeroSerie || null,
      descripcionGeneral: body.descripcionGeneral || null,
      fechaCompra: formatearFecha(body.fechaCompra),
      garantiaHasta: formatearFecha(body.garantiaHasta),
      ubicacionHabitual: body.ubicacionHabitual || null,
      notasTecnicas: body.notasTecnicas || null,
      estadoActivo: !!body.estadoActivo,
      fotoBase64: this.selectedFile()?.base64 || null
    };

    const request$ = this.id
      ? this.equipos.actualizar(this.id, req as any)
      : this.equipos.crear(req as any);

      request$.subscribe({
        next: (res) => {
          this.loading.set(false);
          this.snack.open('Equipo guardado correctamente.', 'OK', { duration: 2200, panelClass: 'rs-toast-success' });
          
          // Si estamos en un modal, lo cerramos y devolvemos el ID. Si no, navegamos.
          if (this.dialogRef) {
            this.dialogRef.close(res); 
          } else {
            this.router.navigate(['/equipos', res.id]);
          }
        },
      error: (err) => {
        this.loading.set(false);
        console.error("Error del backend:", err);
        this.snack.open('No se pudo guardar el equipo en la base de datos.', 'OK', { duration: 3000, panelClass: 'rs-toast-error' });
      }
    });
  }

cancelar(): void {
    if (this.dialogRef) {
      this.dialogRef.close(); // Cierra el modal
      return;
    }
    if (this.id) {
      this.router.navigate(['/equipos', this.id]);
      return;
    }
    this.router.navigateByUrl('/equipos');
  }
}