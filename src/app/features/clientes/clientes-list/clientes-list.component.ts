import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ClientesService } from '../clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog/confirm-delete-dialog.component';
import {
  ClienteFormDialogComponent,
  ClienteFormDialogData
} from '../cliente-form-dialog/cliente-form-dialog.component';

function getSpanishPaginatorIntl(): MatPaginatorIntl {
  const paginatorIntl = new MatPaginatorIntl();

  paginatorIntl.itemsPerPageLabel = 'Elementos por página:';
  paginatorIntl.nextPageLabel = 'Siguiente página';
  paginatorIntl.previousPageLabel = 'Página anterior';
  paginatorIntl.firstPageLabel = 'Primera página';
  paginatorIntl.lastPageLabel = 'Última página';

  paginatorIntl.getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }

    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);

    return `${startIndex + 1} – ${endIndex} de ${length}`;
  };

  return paginatorIntl;
}

@Component({
  selector: 'rs-clientes-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: getSpanishPaginatorIntl
    }
  ],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss'
})
export class ClientesListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientes = inject(ClientesService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  displayedColumns = ['nombre', 'telefono', 'email', 'totalWos', 'lastWoDate', 'accion'];

  items: ClienteResumen[] = [];
  total = 0;
  page = 0;
  size = 10;
  deletingId: string | null = null;
  saving = false;

  form = this.fb.nonNullable.group({
    query: ''
  });

  ngOnInit(): void {
    this.cargar();

    this.form.valueChanges
      .pipe(
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.page = 0;
        this.cargar();
      });
  }

  cargar(): void {
    const q = this.form.getRawValue().query ?? '';

    this.clientes
      .listar(q, this.page, this.size)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items = res.items ?? [];
          this.total = res.total ?? 0;

          if (this.page > 0 && this.items.length === 0 && this.total > 0) {
            this.page = Math.max(0, this.page - 1);
            this.cargar();
          }
        },
        error: (err) => {
          console.error('Error cargando clientes:', err);
          this.items = [];
          this.total = 0;
          this.snack.open('No se pudieron cargar los clientes', 'OK', { duration: 2500 });
        }
      });
  }

  paginar(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }

  limpiarBusqueda(): void {
    if (!this.form.get('query')?.value) return;

    this.page = 0;
    this.form.patchValue({ query: '' });
  }

  eliminando(row: ClienteResumen): boolean {
    return this.deletingId === row.id;
  }

  trackById(_: number, row: ClienteResumen): string {
    return row.id;
  }

  getClientInitials(name: string | null | undefined): string {
    if (!name?.trim()) return 'CL';

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
    return initials || 'CL';
  }

  getAvatarTone(name: string | null | undefined): 'neon' | 'ice' | 'slate' | 'navy' {
    const value = (name ?? '').trim();
    if (!value) return 'slate';

    const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const tones: Array<'neon' | 'ice' | 'slate' | 'navy'> = ['neon', 'ice', 'slate', 'navy'];

    return tones[hash % tones.length];
  }

  invitarPorWhatsapp(): void {
    const text = encodeURIComponent(
      'Hola, te compartimos nuestro canal de atención de ReparaSuite para registrar o dar seguimiento a tu equipo.'
    );

    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  abrirModalCrear(): void {
    if (this.saving) return;

    const ref = this.dialog.open(ClienteFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      data: {
        modo: 'crear',
        cliente: null
      } satisfies ClienteFormDialogData
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;

        this.saving = true;

        this.clientes
          .crear(payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving = false;
              this.page = 0;
              this.cargar();
              this.snack.open('Cliente creado correctamente', 'OK', { duration: 2200 });
            },
            error: (err) => {
              console.error('Error creando cliente:', err);
              this.saving = false;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                'No se pudo crear el cliente';

              this.snack.open(msg, 'OK', { duration: 3200 });
            }
          });
      });
  }

  abrirModalEditar(row: ClienteResumen): void {
    if (!row?.id || this.saving) return;

    const ref = this.dialog.open(ClienteFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      data: {
        modo: 'editar',
        cliente: row
      } satisfies ClienteFormDialogData
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;

        this.saving = true;

        this.clientes
          .actualizar(row.id, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving = false;
              this.cargar();
              this.snack.open('Cliente actualizado correctamente', 'OK', { duration: 2200 });
            },
            error: (err) => {
              console.error('Error actualizando cliente:', err);
              this.saving = false;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                'No se pudo actualizar el cliente';

              this.snack.open(msg, 'OK', { duration: 3200 });
            }
          });
      });
  }

  eliminar(row: ClienteResumen): void {
    if (!row?.id || this.deletingId) return;

    const ref = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '420px',
      autoFocus: false,
      restoreFocus: true,
      data: {
        title: 'Eliminar cliente',
        message:
          `Se eliminará el cliente "${row.nombre}". ` +
          `Esta acción también puede afectar órdenes relacionadas si no existen validaciones en backend.`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar'
      }
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;

        this.deletingId = row.id;

        this.clientes
          .eliminar(row.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snack.open('Cliente eliminado correctamente', 'OK', { duration: 2200 });
              this.deletingId = null;
              this.items = this.items.filter(x => x.id !== row.id);
              this.total = Math.max(0, this.total - 1);
              this.cargar();
            },
            error: (err) => {
              console.error('Error eliminando cliente:', err);
              this.deletingId = null;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                'No se pudo eliminar el cliente';

              this.snack.open(msg, 'OK', { duration: 3200 });
            }
          });
      });
  }
}