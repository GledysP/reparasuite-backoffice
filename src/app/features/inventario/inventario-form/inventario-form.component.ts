import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InventarioService } from '../inventario.service';
import { InventarioCategoriaDto } from '../../../core/models/tipos';

@Component({
  selector: 'rs-inventario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './inventario-form.component.html',
  styleUrl: './inventario-form.component.scss'
})
export class InventarioFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private service = inject(InventarioService);

  id: string | null = null;
  loading = signal(false);
  categorias = signal<InventarioCategoriaDto[]>([]);
  imagenPreviewUrl = signal<string | null>(null);

  private imagenFile: File | null = null;

  form = this.fb.group({
    sku: ['', Validators.required],
    codigoBarras: [''],
    nombre: ['', Validators.required],
    descripcion: [''],
    categoriaId: [''],
    marca: [''],
    modeloCompatibilidad: [''],
    unidadMedida: ['UNIDAD', Validators.required],
    stockMinimo: ['0'],
    stockMaximo: [''],
    controlaStock: [true],
    permiteStockNegativo: [false],
    costoPromedio: ['0'],
    ultimoCosto: ['0'],
    precioVenta: ['0'],
    ubicacionAlmacen: [''],
    notas: [''],
    activo: [true]
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.service.categorias().subscribe(x => this.categorias.set(x));

    if (this.id) {
      this.service.obtener(this.id).subscribe({
        next: (i) => {
          this.form.patchValue({
            sku: i.sku,
            codigoBarras: i.codigoBarras ?? '',
            nombre: i.nombre,
            descripcion: i.descripcion ?? '',
            categoriaId: i.categoria?.id ?? '',
            marca: i.marca ?? '',
            modeloCompatibilidad: i.modeloCompatibilidad ?? '',
            unidadMedida: i.unidadMedida,
            stockMinimo: i.stockMinimo ?? '0',
            stockMaximo: i.stockMaximo ?? '',
            controlaStock: i.controlaStock,
            permiteStockNegativo: i.permiteStockNegativo,
            costoPromedio: i.costoPromedio ?? '0',
            ultimoCosto: i.ultimoCosto ?? '0',
            precioVenta: i.precioVenta ?? '0',
            ubicacionAlmacen: i.ubicacionAlmacen ?? '',
            notas: i.notas ?? '',
            activo: i.activo
          });

          const imagenExistente =
            (i as any)?.imagenUrl ||
            (i as any)?.fotoUrl ||
            (i as any)?.imageUrl ||
            null;

          if (imagenExistente) {
            this.imagenPreviewUrl.set(imagenExistente);
          }
        }
      });
    }
  }

  get margenGanancia(): number {
    const precio = this.toNumber(this.form.get('precioVenta')?.value);
    const ultimoCosto = this.toNumber(this.form.get('ultimoCosto')?.value);
    return precio - ultimoCosto;
  }

  triggerImageInput(input: HTMLInputElement): void {
    input.click();
  }

  onImageSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.snack.open('Selecciona un archivo de imagen válido.', 'OK', { duration: 2400 });
      target.value = '';
      return;
    }

    this.imagenFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreviewUrl.set(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  removeImage(input: HTMLInputElement): void {
    this.imagenFile = null;
    this.imagenPreviewUrl.set(null);
    input.value = '';
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const body = this.form.getRawValue();

    const req = {
      sku: body.sku!,
      codigoBarras: body.codigoBarras || null,
      nombre: body.nombre!,
      descripcion: body.descripcion || null,
      categoriaId: body.categoriaId || null,
      marca: body.marca || null,
      modeloCompatibilidad: body.modeloCompatibilidad || null,
      unidadMedida: body.unidadMedida || 'UNIDAD',
      stockMinimo: body.stockMinimo || '0',
      stockMaximo: body.stockMaximo || null,
      controlaStock: !!body.controlaStock,
      permiteStockNegativo: !!body.permiteStockNegativo,
      costoPromedio: body.costoPromedio || '0',
      ultimoCosto: body.ultimoCosto || '0',
      precioVenta: body.precioVenta || '0',
      ubicacionAlmacen: body.ubicacionAlmacen || null,
      notas: body.notas || null,
      activo: !!body.activo
    };

    const obs = this.id
      ? this.service.actualizar(this.id, req)
      : this.service.crear(req);

    obs.subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snack.open('Item guardado', 'OK', { duration: 2200 });
        this.router.navigate(['/inventario', res.id]);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al guardar item', 'OK', { duration: 2600 });
      }
    });
  }

  cancelar(): void {
    if (this.id) {
      this.router.navigate(['/inventario', this.id]);
      return;
    }
    this.router.navigateByUrl('/inventario');
  }
}