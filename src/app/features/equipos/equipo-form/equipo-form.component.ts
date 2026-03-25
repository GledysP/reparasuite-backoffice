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
import { CategoriaEquipoDialogComponent } from '../categoria-equipo-dialog/categoria-equipo-dialog.component';

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

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  id: string | null = null;
  loading = signal(false);
  isDragOver = signal(false);

  categorias = signal<CategoriaEquipoDto[]>([]);
  clientesItems = signal<ClienteResumen[]>([]);
  filteredClientes = signal<ClienteResumen[]>([]);
  selectedFiles = signal<File[]>([]);

  clienteSearchCtrl = new FormControl<ClienteResumen | string>('');

  readonly tiposEquipoSugeridos: string[] = [
    'Portátil',
    'Laptop',
    'Desktop',
    'Smartphone',
    'Tablet',
    'Televisor',
    'Monitor',
    'Impresora',
    'Router',
    'Microondas',
    'Lavadora',
    'Aire acondicionado'
  ];

  readonly marcasSugeridas: string[] = [
    'Dell',
    'Lenovo',
    'HP',
    'Asus',
    'Acer',
    'Apple',
    'Samsung',
    'LG',
    'Sony',
    'TP-Link',
    'Xiaomi',
    'Canon',
    'Epson'
  ];

  form = this.fb.group({
    clienteId: ['', Validators.required],
    categoriaEquipoId: [''],
    codigoInterno: [''],
    tipoEquipo: [''],
    marca: [''],
    modelo: [''],
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

    if (this.id) {
      this.equipos.obtener(this.id).subscribe({
        next: (equipo) => {
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

      if (typeof value === 'string') {
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

  filteredTiposEquipo(): string[] {
    const term = (this.form.controls.tipoEquipo.value || '').toLowerCase().trim();
    if (!term) return this.tiposEquipoSugeridos.slice(0, 8);
    return this.tiposEquipoSugeridos
      .filter(item => item.toLowerCase().includes(term))
      .slice(0, 8);
  }

  filteredMarcas(): string[] {
    const term = (this.form.controls.marca.value || '').toLowerCase().trim();
    if (!term) return this.marcasSugeridas.slice(0, 8);
    return this.marcasSugeridas
      .filter(item => item.toLowerCase().includes(term))
      .slice(0, 8);
  }

  abrirNuevaCategoria(): void {
    const ref = this.dialog.open(CategoriaEquipoDialogComponent, {
      width: '620px',
      maxWidth: '94vw',
      data: {}
    });

    ref.afterClosed().subscribe((created?: CategoriaEquipoDto) => {
      if (!created) return;

      this.equipos.categorias().subscribe(list => {
        this.categorias.set(list);
        this.form.patchValue({ categoriaEquipoId: created.id });
        this.snack.open('Categoría creada', 'OK', { duration: 2200 });
      });
    });
  }

  editarCategoriaActual(): void {
    const categoriaId = this.form.controls.categoriaEquipoId.value;

    if (!categoriaId) {
      this.snack.open('Selecciona una categoría primero', 'OK', { duration: 2200 });
      return;
    }

    const categoria = this.categorias().find(item => item.id === categoriaId);

    if (!categoria) {
      this.snack.open('No se encontró la categoría seleccionada', 'OK', { duration: 2200 });
      return;
    }

    const ref = this.dialog.open(CategoriaEquipoDialogComponent, {
      width: '620px',
      maxWidth: '94vw',
      data: { categoria }
    });

    ref.afterClosed().subscribe((updated?: CategoriaEquipoDto) => {
      if (!updated) return;

      this.equipos.categorias().subscribe(list => {
        this.categorias.set(list);
        this.form.patchValue({ categoriaEquipoId: updated.id });
        this.snack.open('Categoría actualizada', 'OK', { duration: 2200 });
      });
    });
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
    if (!files?.length) return;

    this.addFiles(files);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.addFiles(input.files);
    input.value = '';
  }

  private addFiles(fileList: FileList): void {
    const current = this.selectedFiles();
    const incoming = Array.from(fileList);

    const merged = [...current];

    for (const file of incoming) {
      const alreadyExists = merged.some(
        item =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      );

      if (!alreadyExists) {
        merged.push(file);
      }
    }

    this.selectedFiles.set(merged);
  }

  removeFile(index: number): void {
    const next = [...this.selectedFiles()];
    next.splice(index, 1);
    this.selectedFiles.set(next);
  }

  clearFiles(): void {
    this.selectedFiles.set([]);

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  getFileIcon(file: File): string {
    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf')) return 'picture_as_pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'description';
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'table_chart';
    if (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif')
    ) return 'image';

    return 'attach_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getClienteResumen(): string {
    const value = this.clienteSearchCtrl.value;
    if (!value) return '';

    if (typeof value === 'string') return value;
    return value.nombre || '';
  }

  getEquipoResumen(): string {
    const tipo = this.form.controls.tipoEquipo.value?.trim() || '';
    const marca = this.form.controls.marca.value?.trim() || '';
    const modelo = this.form.controls.modelo.value?.trim() || '';

    return [tipo, marca, modelo].filter(Boolean).join(' · ');
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Completa los campos requeridos antes de guardar', 'OK', {
        duration: 2200
      });
      return;
    }

    this.loading.set(true);

    const body = this.form.getRawValue();

    const req = {
      clienteId: body.clienteId!,
      categoriaEquipoId: body.categoriaEquipoId || null,
      codigoInterno: body.codigoInterno || null,
      tipoEquipo: body.tipoEquipo || null,
      marca: body.marca || null,
      modelo: body.modelo || null,
      numeroSerie: body.numeroSerie || null,
      descripcionGeneral: body.descripcionGeneral || null,
      fechaCompra: body.fechaCompra || null,
      garantiaHasta: body.garantiaHasta || null,
      ubicacionHabitual: body.ubicacionHabitual || null,
      notasTecnicas: body.notasTecnicas || null,
      estadoActivo: !!body.estadoActivo
    };

    const request$ = this.id
      ? this.equipos.actualizar(this.id, req)
      : this.equipos.crear(req);

    request$.subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snack.open('Equipo guardado', 'OK', { duration: 2200 });
        this.router.navigate(['/equipos', res.id]);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al guardar equipo', 'OK', { duration: 2600 });
      }
    });
  }

  cancelar(): void {
    if (this.id) {
      this.router.navigate(['/equipos', this.id]);
      return;
    }

    this.router.navigateByUrl('/equipos');
  }
}