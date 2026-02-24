import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MatDividerModule } from '@angular/material/divider';

import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService, OtCrearRequest } from '../ordenes-trabajo.service';
import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import { UsuarioResumen, ClienteResumen, TicketDetalleDto } from '../../../core/models/tipos';

import { ClienteBuscarDialogComponent } from './cliente-buscar-dialog.component';
import { TicketsService } from '../../tickets/tickets.service';

type FotoPreview = {
  source: 'local' | 'ticket';
  file?: File;
  url: string;
  name: string;
  size?: number;
};

type TicketSummaryRef = {
  id: string;
  estado?: string | null;
  equipo?: string | null;
  descripcionFalla?: string | null;
  tipoServicioSugerido?: 'TIENDA' | 'DOMICILIO' | string | null;
  direccion?: string | null;
};

@Component({
  selector: 'rs-ordenes-trabajo-nueva',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatRadioModule, MatSelectModule, MatButtonModule,
    MatSnackBarModule, MatIconModule, MatDialogModule,
    MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatAutocompleteModule, MatDividerModule
  ],
  templateUrl: './ordenes-trabajo-nueva.component.html',
  styleUrl: './ordenes-trabajo-nueva.component.scss',
})
export class OrdenesTrabajoNuevaComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private usuarios = inject(UsuariosService);
  private ordenes = inject(OrdenesTrabajoService);
  private tickets = inject(TicketsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  private qpSub?: Subscription;

  tecnicos: UsuarioResumen[] = [];
  prioridades: PrioridadOt[] = ['BAJA', 'MEDIA', 'ALTA'];

  clienteId: string | null = null;
  fromTicket = false;

  fotos: File[] = []; // solo fotos locales para subir a OT
  fotoPreviews: FotoPreview[] = []; // locales + referencias del ticket
  isDragOver = false;

  ticketId: string | null = null;
  ticketRef: TicketSummaryRef | null = null;

  form = this.fb.group({
    clienteNombre: ['', [Validators.required]],
    clienteTelefono: [''],
    clienteEmail: [''],

    tipo: ['TIENDA' as TipoOt, [Validators.required]],
    direccion: [''],
    notasAcceso: [''],
    fechaPrevistaDomicilio: [null as Date | null],
    fechaProgramada: [null as Date | null],

    // ✅ NUEVO: equipo propio en OT
    equipo: ['', [Validators.required, Validators.minLength(2)]],

    // ✅ Descripción = falla / trabajo
    descripcion: ['', [Validators.required, Validators.minLength(3)]],

    prioridad: new FormControl<PrioridadOt>('MEDIA', { nonNullable: true }),
    tecnicoId: [null as string | null],
  });

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.queryParamMap.get('ticketId');
    this.fromTicket = this.route.snapshot.queryParamMap.get('fromTicket') === '1';

    this.usuarios.listar(true).subscribe(u => {
      this.tecnicos = u.filter(x => x.rol === 'TECNICO');
    });

    // Prefill desde query params (viene del detalle de ticket)
    this.qpSub = this.route.queryParamMap.subscribe((qp) => {
      const clienteId = qp.get('clienteId');
      const clienteNombre = qp.get('clienteNombre');
      const clienteTelefono = qp.get('clienteTelefono');
      const clienteEmail = qp.get('clienteEmail');

      const tipo = qp.get('tipo') as TipoOt | null;
      const direccion = qp.get('direccion');

      // ✅ nuevo/compat: equipo puede venir como "equipo", fallback "asunto"
      const equipo = qp.get('equipo') || qp.get('asunto');

      // ✅ nuevo/compat: falla puede venir como "descripcionFalla", fallback parse de descripcion
      const descripcionFalla = qp.get('descripcionFalla');
      const descripcionLegacy = qp.get('descripcion');
      const descripcionLimpia = this.buildDescripcionTrabajoPrefill(descripcionFalla, descripcionLegacy);

      if (clienteId) this.clienteId = clienteId;

      this.form.patchValue({
        clienteNombre: clienteNombre || this.form.value.clienteNombre || '',
        clienteTelefono: clienteTelefono || this.form.value.clienteTelefono || '',
        clienteEmail: clienteEmail || this.form.value.clienteEmail || '',
        tipo: (tipo === 'DOMICILIO' || tipo === 'TIENDA') ? tipo : (this.form.value.tipo ?? 'TIENDA'),
        direccion: direccion || this.form.value.direccion || '',
        equipo: (equipo || this.form.value.equipo || ''),
        descripcion: (descripcionLimpia || this.form.value.descripcion || '')
      }, { emitEvent: false });
    });

    // Fallback si entran directo con ticketId y sin query params completos
    if (this.ticketId && !this.route.snapshot.queryParamMap.get('clienteNombre')) {
      this.cargarTicketParaPrefill(this.ticketId);
    }

    // Si viene de ticket, intentamos cargarlo también para mostrar fotos referencia (aunque ya haya query params)
    if (this.ticketId) {
      this.cargarTicketFotosReferencia(this.ticketId);
    }
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
    this.clearPreviews();
  }

  // =========================
  // Getters para template (sin arrow functions en HTML)
  // =========================

  get hasTicketPhotoRefs(): boolean {
    return this.fotoPreviews.some(p => p.source === 'ticket');
  }

  get hasLocalPhotoPreviews(): boolean {
    return this.fotoPreviews.some(p => p.source === 'local');
  }

  get ticketPhotoRefs(): FotoPreview[] {
    return this.fotoPreviews.filter(p => p.source === 'ticket');
  }

  get localPhotoPreviews(): FotoPreview[] {
    return this.fotoPreviews.filter(p => p.source === 'local');
  }

  get selectedFileName(): string | null {
    if (this.fotos.length === 0) return null;
    return this.fotos.length === 1 ? this.fotos[0].name : `${this.fotos.length} archivos seleccionados`;
  }

  // =========================
  // Prefill / ticket helpers
  // =========================

  private cargarTicketParaPrefill(ticketId: string): void {
    this.tickets.obtener(ticketId).subscribe({
      next: (t: TicketDetalleDto) => {
        const x = t as any;

        const equipo = this.firstNonBlank(
          x.equipo,
          x.asunto
        );

        const descripcion = this.firstNonBlank(
          x.descripcionFalla,
          this.extractDescripcionFallaFromLegacy(x.descripcion),
          x.descripcion
        );

        const tipo = (x.tipoServicioSugerido === 'DOMICILIO' || x.tipoServicioSugerido === 'TIENDA')
          ? x.tipoServicioSugerido
          : null;

        const direccion = this.firstNonBlank(x.direccion, x.direccionSolicitud);

        this.ticketRef = {
          id: x.id,
          estado: x.estado,
          equipo,
          descripcionFalla: descripcion,
          tipoServicioSugerido: tipo,
          direccion
        };

        this.clienteId = this.firstNonBlank(x.clienteId, this.clienteId) as string | null;

        this.form.patchValue({
          clienteNombre: this.firstNonBlank(x.clienteNombre, this.form.value.clienteNombre) || '',
          clienteTelefono: this.firstNonBlank(x.clienteTelefono, this.form.value.clienteTelefono) || '',
          clienteEmail: this.firstNonBlank(x.clienteEmail, this.form.value.clienteEmail) || '',
          tipo: (tipo === 'DOMICILIO' || tipo === 'TIENDA') ? tipo : (this.form.value.tipo ?? 'TIENDA'),
          direccion: this.firstNonBlank(direccion, this.form.value.direccion) || '',
          equipo: this.firstNonBlank(equipo, this.form.value.equipo) || '',
          descripcion: this.firstNonBlank(descripcion, this.form.value.descripcion) || ''
        }, { emitEvent: false });
      },
      error: () => {
        this.snack.open('No se pudo leer el ticket para prellenar', 'OK', { duration: 2500 });
      }
    });
  }

  private cargarTicketFotosReferencia(ticketId: string): void {
    this.tickets.obtener(ticketId).subscribe({
      next: (t: TicketDetalleDto) => {
        const x = t as any;

        // soporta ambos formatos: fotos[] o fotoUrl legacy
        const refs: FotoPreview[] = [];

        if (Array.isArray(x.fotos)) {
          for (const f of x.fotos) {
            const url = this.resolveFileUrl(f?.url);
            if (!url) continue;
            refs.push({
              source: 'ticket',
              url,
              name: f?.nombreOriginal || 'foto-ticket'
            });
          }
        } else if (x.fotoUrl) {
          const url = this.resolveFileUrl(x.fotoUrl);
          if (url) {
            refs.push({
              source: 'ticket',
              url,
              name: 'foto-ticket'
            });
          }
        }

        if (!refs.length) return;

        // conserva fotos locales existentes y reemplaza refs de ticket
        const locals = this.fotoPreviews.filter(p => p.source === 'local');
        this.fotoPreviews = [...refs, ...locals];
      },
      error: () => {
        // Silencioso: no bloquea creación de OT
      }
    });
  }

  private buildDescripcionTrabajoPrefill(
    descripcionFalla?: string | null,
    descripcionLegacy?: string | null
  ): string {
    const falla = (descripcionFalla || '').trim();
    if (falla) return falla;

    const fromLegacy = this.extractDescripcionFallaFromLegacy(descripcionLegacy || '');
    if (fromLegacy) return fromLegacy;

    return (descripcionLegacy || '').trim();
  }

  private extractDescripcionFallaFromLegacy(text: string): string {
    const raw = (text || '').trim();
    if (!raw) return '';

    // intenta extraer línea estructurada
    const m1 = raw.match(/Falla reportada:\s*(.+)/i);
    if (m1?.[1]) return m1[1].trim();

    const m2 = raw.match(/Descripci[oó]n de la falla:\s*(.+)/i);
    if (m2?.[1]) return m2[1].trim();

    // intenta extraer bloque "Falla reportada: ... \n"
    const m3 = raw.match(/Falla reportada:\s*([\s\S]*?)(?:\n[A-ZÁÉÍÓÚa-z].*?:|$)/i);
    if (m3?.[1]) return m3[1].trim();

    return '';
  }

  private firstNonBlank<T = string>(...values: any[]): T | null {
    for (const v of values) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        if (t) return t as unknown as T;
      } else {
        return v as T;
      }
    }
    return null;
  }

  resolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }

  // =========================
  // Fotos locales (upload OT)
  // =========================

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
    input.value = '';
  }

  private setFiles(files: File[]) {
    const onlyImages = files.filter(f => f.type.startsWith('image/'));
    if (!onlyImages.length) {
      this.snack.open('Selecciona imágenes válidas', 'OK', { duration: 2000 });
      return;
    }

    // reemplaza solo previews locales, conserva referencias del ticket
    this.clearLocalPreviews();

    this.fotos = onlyImages;

    const localPreviews: FotoPreview[] = onlyImages.map(file => ({
      source: 'local',
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    const ticketRefs = this.fotoPreviews.filter(p => p.source === 'ticket');
    this.fotoPreviews = [...ticketRefs, ...localPreviews];

    this.snack.open(`${this.fotos.length} foto(s) lista(s)`, 'OK', { duration: 2000 });
  }

  removeLocalFile(indexInLocalList: number) {
    const locals = this.localPhotoPreviews;
    const target = locals[indexInLocalList];
    if (!target) return;

    if (target.url) URL.revokeObjectURL(target.url);

    // quitar de fotos[]
    this.fotos = this.fotos.filter((_, i) => i !== indexInLocalList);

    // quitar del array combinado usando referencia URL + source local
    let removed = false;
    this.fotoPreviews = this.fotoPreviews.filter(p => {
      if (removed) return true;
      if (p.source === 'local' && p.url === target.url) {
        removed = true;
        return false;
      }
      return true;
    });
  }

  clearLocalFiles() {
    this.clearLocalPreviews();
    this.fotos = [];
  }

  clearPreviews() {
    // limpia solo objectURLs locales
    this.fotoPreviews
      .filter(p => p.source === 'local')
      .forEach(p => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    this.fotoPreviews = [];
    this.fotos = [];
  }

  private clearLocalPreviews() {
    this.fotoPreviews
      .filter(p => p.source === 'local')
      .forEach(p => {
        if (p.url) URL.revokeObjectURL(p.url);
      });

    this.fotoPreviews = this.fotoPreviews.filter(p => p.source !== 'local');
  }

  // =========================
  // Cliente
  // =========================

  buscarCliente() {
    if (this.fromTicket && this.clienteId) {
      this.snack.open('Esta OT viene de un ticket. El cliente ya está vinculado.', 'OK', { duration: 2500 });
      return;
    }

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

  // =========================
  // Crear OT
  // =========================

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Por favor revisa los campos requeridos', 'OK', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();

    const fechaFinal =
      v.tipo === 'DOMICILIO'
        ? v.fechaPrevistaDomicilio
        : v.fechaProgramada;

    const body: OtCrearRequest = {
      cliente: {
        id: this.clienteId,
        nombre: (v.clienteNombre ?? '').trim(),
        telefono: (v.clienteTelefono ?? '').trim() || null,
        email: (v.clienteEmail ?? '').trim() || null,
      },
      tipo: (v.tipo ?? 'TIENDA') as TipoOt,
      prioridad: (v.prioridad ?? 'MEDIA') as PrioridadOt,

      // ✅ nuevo
      equipo: (v.equipo ?? '').trim(),

      // ✅ falla / trabajo a realizar
      descripcion: (v.descripcion ?? '').trim(),

      tecnicoId: v.tecnicoId || null,
      fechaPrevista: fechaFinal ? new Date(fechaFinal).toISOString() : null,
      direccion: v.tipo === 'DOMICILIO' ? ((v.direccion ?? '').trim() || null) : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? ((v.notasAcceso ?? '').trim() || null) : null,
    };

    this.ordenes.crear(body).pipe(
      switchMap((res: any) => {
        const id = res.id as string;

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
        this.clearLocalFiles();
        this.router.navigate(['/ordenes-trabajo', id]);
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Error al crear la orden', 'OK', { duration: 3000 });
      }
    });
  }

  cancelar() {
    this.clearLocalFiles();
    if (this.ticketId) {
      this.router.navigate(['/tickets', this.ticketId]);
      return;
    }
    this.router.navigateByUrl('/ordenes-trabajo');
  }
}