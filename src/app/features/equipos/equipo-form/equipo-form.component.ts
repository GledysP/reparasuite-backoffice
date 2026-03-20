import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    TextFieldModule
  ],
  templateUrl: './equipo-form.component.html',
  styleUrl: './equipo-form.component.scss'
})
export class EquipoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private equipos = inject(EquiposService);
  private clientes = inject(ClientesService);

  id: string | null = null;
  loading = signal(false);
  categorias = signal<CategoriaEquipoDto[]>([]);
  clientesItems = signal<ClienteResumen[]>([]);
  filteredClientes = signal<ClienteResumen[]>([]);

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
        next: (e) => {
          this.form.patchValue({
            clienteId: e.clienteId,
            categoriaEquipoId: e.categoria?.id ?? '',
            codigoInterno: e.codigoInterno ?? '',
            tipoEquipo: e.tipoEquipo ?? '',
            marca: e.marca ?? '',
            modelo: e.modelo ?? '',
            numeroSerie: e.numeroSerie ?? '',
            descripcionGeneral: e.descripcionGeneral ?? '',
            fechaCompra: e.fechaCompra ?? '',
            garantiaHasta: e.garantiaHasta ?? '',
            ubicacionHabitual: e.ubicacionHabitual ?? '',
            notasTecnicas: e.notasTecnicas ?? '',
            estadoActivo: e.estadoActivo
          });

          this.syncClienteDisplay();
        }
      });
    }
  }

  setupClienteAutocomplete(): void {
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

  cargarCatalogos(): void {
    this.equipos.categorias().subscribe(x => this.categorias.set(x));
    this.clientes.listar('', 0, 100).subscribe(x => {
      this.clientesItems.set(x.items);
      this.filteredClientes.set(x.items);
      this.syncClienteDisplay();
    });
  }

  syncClienteDisplay(): void {
    const clienteId = this.form.controls.clienteId.value;
    if (!clienteId) return;

    const cliente = this.clientesItems().find(c => c.id === clienteId);
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
    return this.tiposEquipoSugeridos.filter(x => x.toLowerCase().includes(term)).slice(0, 8);
  }

  filteredMarcas(): string[] {
    const term = (this.form.controls.marca.value || '').toLowerCase().trim();
    if (!term) return this.marcasSugeridas.slice(0, 8);
    return this.marcasSugeridas.filter(x => x.toLowerCase().includes(term)).slice(0, 8);
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

    const categoria = this.categorias().find(x => x.id === categoriaId);
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

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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

    const obs = this.id
      ? this.equipos.actualizar(this.id, req)
      : this.equipos.crear(req);

    obs.subscribe({
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