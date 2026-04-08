import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import {
  CategoriaEquipoDto,
  ClienteResumen,
  EquipoResumenDto,
  TicketDetalleDto,
  UsuarioResumen
} from '../../../core/models/tipos';

import { TicketsService } from '../../tickets/tickets.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { EquiposService } from '../../equipos/equipos.service';
import { ClienteBuscarDialogComponent } from './cliente-buscar-dialog.component';
import { OrdenesTrabajoService, OtCrearRequest } from '../ordenes-trabajo.service';

type FotoPreview = {
  id?: string;
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
  asunto?: string | null;
  descripcionFalla?: string | null;
  observacionesOriginales?: string | null;
  tipoServicioSugerido?: 'TIENDA' | 'DOMICILIO' | string | null;
  direccion?: string | null;
};

type PeriodoHora = 'AM' | 'PM';

@Component({
  selector: 'rs-ordenes-trabajo-nueva',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './ordenes-trabajo-nueva.component.html',
  styleUrl: './ordenes-trabajo-nueva.component.scss'
})
export class OrdenesTrabajoNuevaComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly usuarios = inject(UsuariosService);
  private readonly ordenes = inject(OrdenesTrabajoService);
  private readonly tickets = inject(TicketsService);
  private readonly equiposService = inject(EquiposService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly subs = new Subscription();
  private readonly ticketOtCacheKey = 'rs_ticket_ot_map';

  private ticketBlobUrls: Record<string, string> = {};

  tecnicos: UsuarioResumen[] = [];

  readonly categorias = signal<CategoriaEquipoDto[]>([]);
  readonly equiposCliente = signal<EquipoResumenDto[]>([]);
  readonly activeTicketPhoto = signal<FotoPreview | null>(null);

  readonly priorityOptions: Array<{ value: PrioridadOt; label: string }> = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta' }
  ];

  clienteId: string | null = null;
  fromTicket = false;
  ticketId: string | null = null;
  ticketRef: TicketSummaryRef | null = null;

  fotos: File[] = [];
  fotoPreviews: FotoPreview[] = [];

  isDragOver = false;
  guardando = false;
  ticketPhotosLoading = false;
  ticketImageReady = false;

  isImageModalOpen = false;
  imageModalUrl = '';
  imageModalName = '';

  form = this.fb.group({
    clienteNombre: this.fb.nonNullable.control('', [Validators.required]),
    clienteTelefono: this.fb.nonNullable.control('', [Validators.pattern(/^\d*$/)]),
    clienteEmail: this.fb.nonNullable.control('', [Validators.email]),

    tipo: this.fb.nonNullable.control<TipoOt>('TIENDA', [Validators.required]),
    direccion: this.fb.nonNullable.control(''),
    notasAcceso: this.fb.nonNullable.control(''),

    fechaRecepcion: this.fb.control<Date | null>(new Date(), [Validators.required]),

    fechaCita: this.fb.control<Date | null>(null),
    horaCita: this.fb.nonNullable.control('09:00'),
    periodoCita: this.fb.nonNullable.control<PeriodoHora>('AM'),

    fechaPrevista: this.fb.control<string | null>(null),

    equipoId: this.fb.control<string | null>(null),
    categoriaEquipoId: this.fb.control<string | null>(null, [Validators.required]),

    equipo: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    fallaReportada: this.fb.nonNullable.control(''),
    observaciones: this.fb.nonNullable.control(''),

    prioridad: this.fb.nonNullable.control<PrioridadOt>('MEDIA'),
    tecnicoId: this.fb.control<string | null>(null)
  });

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.queryParamMap.get('ticketId');
    this.fromTicket = this.route.snapshot.queryParamMap.get('fromTicket') === '1';

    this.loadTecnicos();
    this.loadCategorias();
    this.setupPrefillFromQueryParams();
    this.setupTipoRules();
    this.setupClienteEquiposSync();
    this.setupEquipoSelectionSync();

    if (this.ticketId) {
      this.cargarTicketParaPrefill(this.ticketId);
      this.cargarTicketFotosReferencia(this.ticketId);
    }

    this.applyTipoValidators();
    this.syncFechaPrevista();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearPreviews();
    this.releaseTicketBlobUrls();
  }

  get isDomicilio(): boolean {
    return this.form.controls.tipo.value === 'DOMICILIO';
  }

  get hasTicketPhotoRefs(): boolean {
    return this.fotoPreviews.some((p) => p.source === 'ticket');
  }

  get ticketPhotoRefs(): FotoPreview[] {
    return this.fotoPreviews.filter((p) => p.source === 'ticket');
  }

  get localPhotoPreviews(): FotoPreview[] {
    return this.fotoPreviews.filter((p) => p.source === 'local');
  }

  get selectedFileName(): string | null {
    if (this.fotos.length === 0) return null;
    return this.fotos.length === 1
      ? this.fotos[0].name
      : `${this.fotos.length} archivos seleccionados`;
  }

  get summaryTipoLabel(): string {
    return this.isDomicilio ? 'A domicilio' : 'En taller';
  }

  get summaryPrioridadLabel(): string {
    const map: Record<PrioridadOt, string> = {
      BAJA: 'Baja',
      MEDIA: 'Media',
      ALTA: 'Alta'
    };
    return map[this.form.controls.prioridad.value] ?? 'Media';
  }

  get summaryEquipoLabel(): string {
    const value = String(this.form.controls.equipo.value || '').trim();
    return value || 'Sin definir';
  }

  get summaryClienteLabel(): string {
    const value = String(this.form.controls.clienteNombre.value || '').trim();
    return value || 'Sin cliente';
  }

  get summaryTecnicoLabel(): string {
    const tecnicoId = this.form.controls.tecnicoId.value;
    if (!tecnicoId) return 'Sin asignar';

    return this.tecnicos.find((t) => t.id === tecnicoId)?.nombre ?? 'Sin asignar';
  }

  get summaryVinculoTicketLabel(): string {
    return this.ticketId ? 'Sí' : 'No';
  }

  get summaryFechaLabel(): string {
    if (this.isDomicilio) {
      const fecha = this.form.controls.fechaCita.value;
      const hora = this.form.controls.horaCita.value;
      const periodo = this.form.controls.periodoCita.value;

      if (!fecha) return 'Pendiente';

      return `${this.formatDateShort(fecha)} · ${hora || '09:00'} ${periodo || 'AM'}`;
    }

    const fecha = this.form.controls.fechaRecepcion.value;
    return fecha ? this.formatDateShort(fecha) : 'Pendiente';
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isImageModalOpen) {
      event.preventDefault();
      this.closeImageModal();
      return;
    }

    const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
    if (!isSaveShortcut || this.isImageModalOpen) return;

    event.preventDefault();

    if (!this.guardando) {
      this.crear();
    }
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  openImageModal(photo?: FotoPreview | null): void {
    if (!photo?.url) return;

    this.imageModalUrl = photo.url;
    this.imageModalName = photo.name || 'Imagen';
    this.isImageModalOpen = true;
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
    this.imageModalUrl = '';
    this.imageModalName = '';
  }

  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = (input.value || '').replace(/\D/g, '');

    if (cleaned !== input.value) {
      input.value = cleaned;
    }

    this.form.controls.clienteTelefono.setValue(cleaned, { emitEvent: true });
  }

  onHoraInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = (input.value || '').replace(/\D/g, '').slice(0, 4);

    let formatted = raw;
    if (raw.length >= 3) {
      formatted = `${raw.slice(0, 2)}:${raw.slice(2)}`;
    }

    if (formatted !== input.value) {
      input.value = formatted;
    }

    this.form.controls.horaCita.setValue(formatted, { emitEvent: true });
  }

  onHoraBlur(): void {
    const raw = String(this.form.controls.horaCita.value || '')
      .replace(/\D/g, '')
      .slice(0, 4);

    if (!raw) {
      this.form.controls.horaCita.setValue('09:00', { emitEvent: true });
      return;
    }

    let hours = Number(raw.slice(0, 2) || '0');
    let minutes = Number(raw.slice(2, 4) || '0');

    if (!Number.isFinite(hours)) hours = 9;
    if (!Number.isFinite(minutes)) minutes = 0;

    hours = Math.min(Math.max(hours, 1), 12);
    minutes = Math.min(Math.max(minutes, 0), 59);

    const normalized = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    this.form.controls.horaCita.setValue(normalized, { emitEvent: true });
  }

  selectTicketPhoto(photo: FotoPreview): void {
    this.ticketImageReady = false;
    this.activeTicketPhoto.set(photo);
  }

  onTicketImageLoaded(): void {
    this.ticketImageReady = true;
  }

  onTicketImageError(): void {
    this.ticketImageReady = true;
  }

  cancelar(): void {
    if (this.guardando) return;

    this.clearLocalFiles();

    if (this.ticketId) {
      this.router.navigate(['/tickets', this.ticketId]);
      return;
    }

    this.router.navigateByUrl('/ordenes-trabajo');
  }

  buscarCliente(): void {
    if (this.guardando) return;

    if (this.fromTicket && this.clienteId) {
      this.snack.open('Esta OT proviene de un ticket. El cliente ya está vinculado.', 'OK', {
        duration: 2500
      });
      return;
    }

    const dialogRef = this.dialog.open(ClienteBuscarDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      panelClass: 'rs-dialog-custom'
    });

    this.subs.add(
      dialogRef.afterClosed().subscribe((cliente: ClienteResumen | undefined) => {
        if (!cliente) return;

        this.clienteId = cliente.id;

        this.form.patchValue({
          clienteNombre: cliente.nombre ?? '',
          clienteTelefono: String(cliente.telefono ?? '').replace(/\D/g, ''),
          clienteEmail: cliente.email ?? '',
          equipoId: null,
          categoriaEquipoId: null
        });

        this.cargarEquiposCliente(cliente.id);
      })
    );
  }

  irAClientes(): void {
    this.router.navigateByUrl('/clientes');
  }

  irANuevoEquipo(): void {
    if (!this.clienteId) {
      this.snack.open('Por favor, selecciona un cliente primero.', 'OK', { duration: 2200 });
      return;
    }

    this.router.navigate(['/equipos/nuevo'], {
      queryParams: { clienteId: this.clienteId }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.setFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files?.length) {
      this.setFiles(Array.from(files));
    }

    input.value = '';
  }

  crear(): void {
    if (this.guardando) return;

    this.syncFechaPrevista();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Completa los campos obligatorios marcados.', 'OK', {
        duration: 2600
      });
      return;
    }

    const v = this.form.getRawValue();
    const observaciones = this.cleanObservacionesText((v.observaciones ?? '').trim());

    const body: OtCrearRequest = {
      cliente: {
        id: this.clienteId,
        nombre: (v.clienteNombre ?? '').trim(),
        telefono: (v.clienteTelefono ?? '').trim() || null,
        email: (v.clienteEmail ?? '').trim() || null
      },
      tipo: (v.tipo ?? 'TIENDA') as TipoOt,
      prioridad: (v.prioridad ?? 'MEDIA') as PrioridadOt,
      equipo: (v.equipo ?? '').trim(),
      equipoId: v.equipoId || null,
      categoriaEquipoId: v.categoriaEquipoId || null,
      fallaReportada: (v.fallaReportada ?? '').trim() || null,
      descripcion: observaciones || '',
      ticketId: this.fromTicket && this.ticketId ? this.ticketId : null,
      tecnicoId: v.tecnicoId || null,
      fechaPrevista: v.fechaPrevista || null,
      direccion: v.tipo === 'DOMICILIO' ? ((v.direccion ?? '').trim() || null) : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? ((v.notasAcceso ?? '').trim() || null) : null
    };

    this.guardando = true;

    this.ordenes.crear(body).pipe(
      switchMap((res: any) => {
        const id = res.id as string;

        if (this.ticketId && id) {
          this.guardarVinculoTicketOtEnCache(this.ticketId, id);
        }

        if (!this.fotos.length) {
          return of({ id });
        }

        const uploads = this.fotos.map((file) =>
          this.ordenes.subirFoto(id, file).pipe(
            catchError((error) => {
              console.error('Error subiendo foto:', error);
              return of(null);
            })
          )
        );

        return forkJoin(uploads).pipe(switchMap(() => of({ id })));
      }),
      finalize(() => {
        this.guardando = false;
      })
    ).subscribe({
      next: ({ id }) => {
        this.snack.open('Orden creada correctamente.', 'Cerrar', { duration: 2500 });
        this.clearLocalFiles();
        this.router.navigate(['/ordenes-trabajo', id]);
      },
      error: (error) => {
        this.snack.open(error?.error?.message || 'No se pudo crear la orden.', 'OK', {
          duration: 3000
        });
      }
    });
  }

  resolveFileUrl(url?: string | null): string {
    if (!url) return '';

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }

  removeLocalFile(indexInLocalList: number): void {
    const locals = this.localPhotoPreviews;
    const target = locals[indexInLocalList];
    if (!target) return;

    if (target.url) {
      URL.revokeObjectURL(target.url);
    }

    this.fotos = this.fotos.filter((_, index) => index !== indexInLocalList);

    let removed = false;
    this.fotoPreviews = this.fotoPreviews.filter((preview) => {
      if (removed) return true;

      if (preview.source === 'local' && preview.url === target.url) {
        removed = true;
        return false;
      }

      return true;
    });
  }

  clearLocalFiles(): void {
    this.clearLocalPreviews();
    this.fotos = [];
  }

  clearPreviews(): void {
    this.fotoPreviews
      .filter((preview) => preview.source === 'local')
      .forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });

    this.fotoPreviews = [];
    this.fotos = [];
  }

  private formatDateShort(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private loadTecnicos(): void {
    this.subs.add(
      this.usuarios.listar(true).subscribe((users) => {
        this.tecnicos = users.filter((user) => user.rol === 'TECNICO');
      })
    );
  }

  private loadCategorias(): void {
    this.subs.add(
      this.equiposService.categorias().subscribe({
        next: (cats) => this.categorias.set(cats),
        error: () => this.categorias.set([])
      })
    );
  }

  private setupClienteEquiposSync(): void {
    this.subs.add(
      this.form.controls.clienteNombre.valueChanges.subscribe((value) => {
        if (this.fromTicket) return;

        const nombre = String(value ?? '').trim();
        if (nombre) return;

        this.clienteId = null;
        this.equiposCliente.set([]);
        this.form.patchValue(
          {
            equipoId: null,
            categoriaEquipoId: null
          },
          { emitEvent: false }
        );
      })
    );
  }

  private setupEquipoSelectionSync(): void {
    this.subs.add(
      this.form.controls.equipoId.valueChanges.subscribe((equipoId) => {
        if (!equipoId) return;

        const found = this.equiposCliente().find((item) => item.id === equipoId);
        if (!found) return;

        const equipoTexto = [found.marca, found.modelo]
          .filter(Boolean)
          .join(' ')
          .trim();

        const currentEquipo = String(this.form.controls.equipo.value ?? '').trim();

        this.form.patchValue(
          {
            equipo: currentEquipo || equipoTexto || found.codigoEquipo,
            categoriaEquipoId: found.categoriaEquipoId ?? this.form.controls.categoriaEquipoId.value
          },
          { emitEvent: false }
        );
      })
    );
  }

  private cargarEquiposCliente(clienteId: string | null): void {
    if (!clienteId) {
      this.equiposCliente.set([]);
      this.form.controls.equipoId.setValue(null, { emitEvent: false });
      return;
    }

    this.subs.add(
      this.equiposService.listar({ clienteId, activo: true, page: 0, size: 100 }).subscribe({
        next: (res) => {
          this.equiposCliente.set(res.items ?? []);

          const currentId = this.form.controls.equipoId.value;
          if (!currentId) return;

          const exists = (res.items ?? []).some((item) => item.id === currentId);
          if (!exists) {
            this.form.controls.equipoId.setValue(null, { emitEvent: false });
          }
        },
        error: () => {
          this.equiposCliente.set([]);
          this.form.controls.equipoId.setValue(null, { emitEvent: false });
        }
      })
    );
  }

  private setupPrefillFromQueryParams(): void {
    this.subs.add(
      this.route.queryParamMap.subscribe((queryParams) => {
        const clienteId = queryParams.get('clienteId');
        const clienteNombre = queryParams.get('clienteNombre');
        const clienteTelefono = queryParams.get('clienteTelefono');
        const clienteEmail = queryParams.get('clienteEmail');

        const tipo = queryParams.get('tipo') as TipoOt | null;
        const direccion = queryParams.get('direccion');

        const equipo = queryParams.get('equipo') || queryParams.get('asunto');
        const descripcionFalla = queryParams.get('descripcionFalla');
        const descripcionLegacy = queryParams.get('descripcion');

        const descripcionLimpia = this.buildDescripcionTrabajoPrefill(
          descripcionFalla,
          descripcionLegacy
        );

        const obsQP = this.cleanObservacionesText(
          (
            queryParams.get('observaciones') ||
            queryParams.get('detalleAdicional') ||
            queryParams.get('comentarios') ||
            ''
          ).trim()
        );

        if (clienteId) {
          this.clienteId = clienteId;
          this.cargarEquiposCliente(clienteId);
        }

        this.form.patchValue({
          clienteNombre: clienteNombre || this.form.controls.clienteNombre.value || '',
          clienteTelefono: String(
            clienteTelefono || this.form.controls.clienteTelefono.value || ''
          ).replace(/\D/g, ''),
          clienteEmail: clienteEmail || this.form.controls.clienteEmail.value || '',
          tipo:
            tipo === 'DOMICILIO' || tipo === 'TIENDA'
              ? tipo
              : this.form.controls.tipo.value,
          direccion: direccion || this.form.controls.direccion.value || '',
          equipo: equipo || this.form.controls.equipo.value || '',
          fallaReportada: descripcionLimpia || this.form.controls.fallaReportada.value || '',
          observaciones: obsQP || this.form.controls.observaciones.value || ''
        }, { emitEvent: false });

        if (this.fromTicket || this.ticketId) {
          this.ticketRef = {
            id: this.ticketId || '',
            estado: queryParams.get('estado'),
            equipo: equipo || null,
            asunto: queryParams.get('asunto'),
            descripcionFalla: descripcionLimpia || null,
            observacionesOriginales: obsQP || null,
            tipoServicioSugerido:
              tipo === 'DOMICILIO' || tipo === 'TIENDA' ? tipo : null,
            direccion: direccion || null
          };
        }

        this.applyTipoValidators();
        this.ensureDefaultDates();
        this.syncFechaPrevista();
      })
    );
  }

  private setupTipoRules(): void {
    this.subs.add(
      this.form.controls.tipo.valueChanges.subscribe(() => {
        this.applyTipoValidators();
        this.ensureDefaultDates();
        this.syncFechaPrevista();
      })
    );

    this.subs.add(
      this.form.controls.fechaRecepcion.valueChanges.subscribe(() => this.syncFechaPrevista())
    );
    this.subs.add(
      this.form.controls.fechaCita.valueChanges.subscribe(() => this.syncFechaPrevista())
    );
    this.subs.add(
      this.form.controls.horaCita.valueChanges.subscribe(() => this.syncFechaPrevista())
    );
    this.subs.add(
      this.form.controls.periodoCita.valueChanges.subscribe(() => this.syncFechaPrevista())
    );
  }

  private applyTipoValidators(): void {
    if (this.isDomicilio) {
      this.form.controls.direccion.setValidators([Validators.required, Validators.minLength(5)]);
      this.form.controls.fechaCita.setValidators([Validators.required]);
      this.form.controls.horaCita.setValidators([
        Validators.required,
        Validators.pattern(/^\d{2}:\d{2}$/)
      ]);
      this.form.controls.periodoCita.setValidators([Validators.required]);

      this.form.controls.fechaRecepcion.clearValidators();
    } else {
      this.form.controls.fechaRecepcion.setValidators([Validators.required]);

      this.form.controls.direccion.clearValidators();
      this.form.controls.fechaCita.clearValidators();
      this.form.controls.horaCita.clearValidators();
      this.form.controls.periodoCita.clearValidators();
    }

    this.form.controls.direccion.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fechaCita.updateValueAndValidity({ emitEvent: false });
    this.form.controls.horaCita.updateValueAndValidity({ emitEvent: false });
    this.form.controls.periodoCita.updateValueAndValidity({ emitEvent: false });
    this.form.controls.fechaRecepcion.updateValueAndValidity({ emitEvent: false });
  }

  private ensureDefaultDates(): void {
    if (this.isDomicilio) {
      if (!this.form.controls.fechaCita.value) {
        this.form.controls.fechaCita.setValue(new Date(), { emitEvent: false });
      }

      if (!this.form.controls.horaCita.value) {
        this.form.controls.horaCita.setValue('09:00', { emitEvent: false });
      }

      if (!this.form.controls.periodoCita.value) {
        this.form.controls.periodoCita.setValue('AM', { emitEvent: false });
      }
    } else {
      if (!this.form.controls.fechaRecepcion.value) {
        this.form.controls.fechaRecepcion.setValue(new Date(), { emitEvent: false });
      }
    }
  }

  private syncFechaPrevista(): void {
    let iso: string | null = null;

    if (this.isDomicilio) {
      const fecha = this.form.controls.fechaCita.value;
      const hora = this.form.controls.horaCita.value;
      const periodo = this.form.controls.periodoCita.value;

      if (fecha && hora && hora.includes(':')) {
        const [hourStr, minuteStr] = hora.split(':');
        let hours = Number(hourStr);
        const minutes = Number(minuteStr || '0');

        if (periodo === 'PM' && hours < 12) hours += 12;
        if (periodo === 'AM' && hours === 12) hours = 0;

        const date = new Date(fecha);
        date.setHours(hours, minutes, 0, 0);

        if (!isNaN(date.getTime())) {
          iso = date.toISOString();
        }
      }
    } else {
      const fecha = this.form.controls.fechaRecepcion.value;

      if (fecha) {
        const date = new Date(fecha);
        date.setHours(9, 0, 0, 0);

        if (!isNaN(date.getTime())) {
          iso = date.toISOString();
        }
      }
    }

    this.form.controls.fechaPrevista.setValue(iso, { emitEvent: false });
  }

  private cargarTicketParaPrefill(ticketId: string): void {
    this.subs.add(
      this.tickets.obtener(ticketId).subscribe({
        next: (ticket: TicketDetalleDto) => {
          const x = ticket as any;

          const equipo = this.firstNonBlank(x.equipo, x.asunto);
          const descripcion = this.firstNonBlank(
            x.descripcionFalla,
            this.extractDescripcionFallaFromLegacy(x.descripcion),
            x.descripcion
          );

          const tipo =
            x.tipoServicioSugerido === 'DOMICILIO' || x.tipoServicioSugerido === 'TIENDA'
              ? x.tipoServicioSugerido
              : null;

          const direccion = this.firstNonBlank(x.direccion, x.direccionSolicitud);
          const obs = this.cleanObservacionesText(
            this.firstNonBlank(x.observaciones, this.pickObservacionesOnly(x)) || ''
          );

          this.ticketRef = {
            id: x.id,
            estado: x.estado,
            equipo,
            asunto: x.asunto,
            descripcionFalla: descripcion,
            observacionesOriginales: obs || null,
            tipoServicioSugerido: tipo,
            direccion
          };

          this.clienteId = this.firstNonBlank(x.clienteId, this.clienteId) as string | null;
          this.cargarEquiposCliente(this.clienteId);

          this.form.patchValue({
            clienteNombre:
              this.firstNonBlank(x.clienteNombre, this.form.controls.clienteNombre.value) || '',
            clienteTelefono: String(
              this.firstNonBlank(x.clienteTelefono, this.form.controls.clienteTelefono.value) || ''
            ).replace(/\D/g, ''),
            clienteEmail:
              this.firstNonBlank(x.clienteEmail, this.form.controls.clienteEmail.value) || '',
            tipo:
              tipo === 'DOMICILIO' || tipo === 'TIENDA'
                ? tipo
                : this.form.controls.tipo.value,
            direccion: this.firstNonBlank(direccion, this.form.controls.direccion.value) || '',
            equipo: this.firstNonBlank(equipo, this.form.controls.equipo.value) || '',
            fallaReportada:
              this.firstNonBlank(descripcion, this.form.controls.fallaReportada.value) || '',
            observaciones: obs || ''
          }, { emitEvent: false });

          this.applyTipoValidators();
          this.ensureDefaultDates();
          this.syncFechaPrevista();
        },
        error: () => {
          this.snack.open('No se pudo leer el ticket para prellenar.', 'OK', {
            duration: 2500
          });
        }
      })
    );
  }

  private cargarTicketFotosReferencia(ticketId: string): void {
    this.ticketPhotosLoading = true;
    this.releaseTicketBlobUrls();

    this.subs.add(
      this.tickets.obtener(ticketId).subscribe({
        next: (ticket: TicketDetalleDto) => {
          const x = ticket as any;
          const refs: FotoPreview[] = [];

          if (Array.isArray(x.fotos)) {
            for (const foto of x.fotos) {
              const url = this.resolveFileUrl(foto?.url);
              if (!url) continue;

              refs.push({
                id: foto?.id,
                source: 'ticket',
                url,
                name: foto?.nombreOriginal || 'foto-ticket'
              });
            }
          } else if (x.fotoUrl) {
            const url = this.resolveFileUrl(x.fotoUrl);
            if (url) {
              refs.push({
                id: 'legacy-foto',
                source: 'ticket',
                url,
                name: 'foto-ticket'
              });
            }
          }

          const locals = this.fotoPreviews.filter((preview) => preview.source === 'local');
          this.fotoPreviews = [...refs, ...locals];

          if (refs.length > 0) {
            this.ticketImageReady = false;
            this.activeTicketPhoto.set(refs[0]);
            this.hydrateTicketPhotoBlobs();
          } else {
            this.activeTicketPhoto.set(null);
            this.ticketImageReady = true;
          }

          this.ticketPhotosLoading = false;
        },
        error: () => {
          this.ticketPhotosLoading = false;
          this.ticketImageReady = true;
          this.activeTicketPhoto.set(null);
        }
      })
    );
  }

  private hydrateTicketPhotoBlobs(): void {
    this.releaseTicketBlobUrls();

    const ticketPhotos = this.fotoPreviews.filter((p) => p.source === 'ticket' && !!p.url);
    if (!ticketPhotos.length) return;

    for (const photo of ticketPhotos) {
      const key = photo.id || photo.url;

      this.http.get(photo.url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const blobUrl = URL.createObjectURL(blob);
          this.ticketBlobUrls[key] = blobUrl;

          this.fotoPreviews = this.fotoPreviews.map((item) => {
            const itemKey = item.id || item.url;
            if (item.source === 'ticket' && itemKey === key) {
              return { ...item, url: blobUrl };
            }
            return item;
          });

          const active = this.activeTicketPhoto();
          const activeKey = active ? (active.id || active.url) : null;

          if (active && active.source === 'ticket' && activeKey === key) {
            this.activeTicketPhoto.set({
              ...active,
              url: blobUrl
            });
          }
        },
        error: () => {
          // fallback silencioso
        }
      });
    }
  }

  private releaseTicketBlobUrls(): void {
    Object.values(this.ticketBlobUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });

    this.ticketBlobUrls = {};
  }

  private setFiles(files: File[]): void {
    const onlyImages = files.filter((file) => file.type.startsWith('image/'));

    if (!onlyImages.length) {
      this.snack.open('Selecciona imágenes válidas.', 'OK', { duration: 2000 });
      return;
    }

    this.clearLocalPreviews();
    this.fotos = onlyImages;

    const localPreviews: FotoPreview[] = onlyImages.map((file) => ({
      source: 'local',
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    const ticketRefs = this.fotoPreviews.filter((preview) => preview.source === 'ticket');
    this.fotoPreviews = [...ticketRefs, ...localPreviews];

    this.snack.open(`${this.fotos.length} foto(s) lista(s).`, 'OK', { duration: 2000 });
  }

  private clearLocalPreviews(): void {
    this.fotoPreviews
      .filter((preview) => preview.source === 'local')
      .forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });

    this.fotoPreviews = this.fotoPreviews.filter((preview) => preview.source !== 'local');
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

    const m1 = raw.match(/Falla reportada:\s*(.+)/i);
    if (m1?.[1]) return m1[1].trim();

    const m2 = raw.match(/Descripci[oó]n de la falla:\s*(.+)/i);
    if (m2?.[1]) return m2[1].trim();

    const m3 = raw.match(/Falla reportada:\s*([\s\S]*?)(?:\n[A-ZÁÉÍÓÚa-z].*?:|$)/i);
    if (m3?.[1]) return m3[1].trim();

    return '';
  }

  private pickObservacionesOnly(x: any): string {
    const direct = this.firstNonBlank(
      x?.observaciones,
      x?.detalleAdicional,
      x?.detalle_adicional,
      x?.comentarios,
      x?.notas,
      x?.nota,
      x?.observacion,
      x?.observacionCliente,
      x?.detalleCliente,
      x?.informacionAdicional,
      x?.infoAdicional,
      x?.detalle,
      x?.comentario
    );

    const directText = (typeof direct === 'string' ? direct : '').trim();
    if (directText) return directText;

    return this.extractObservacionesFromDescription(String(x?.descripcion ?? ''));
  }

  private cleanObservacionesText(text: string): string {
    return String(text || '')
      .replace(/^detalle adicional:\s*/i, '')
      .replace(/^observaciones:\s*/i, '')
      .trim();
  }

  private extractObservacionesFromDescription(text: string): string {
    const raw = (text || '').trim();
    if (!raw) return '';

    const directMatch = raw.match(/Observaciones:\s*([\s\S]*)$/i);
    if (directMatch?.[1]?.trim()) {
      return this.cleanObservacionesText(directMatch[1].trim());
    }

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return '';

    const filtered = lines.filter((line) => {
      const lower = line.toLowerCase();

      if (lower.startsWith('falla reportada:')) return false;
      if (lower.startsWith('descripción de la falla:')) return false;
      if (lower.startsWith('descripcion de la falla:')) return false;
      if (lower.startsWith('tipo sugerido:')) return false;
      if (lower.startsWith('dirección / ubicación:')) return false;
      if (lower.startsWith('direccion / ubicacion:')) return false;
      if (lower.startsWith('equipo:')) return false;
      if (lower.startsWith('equipo / asunto:')) return false;
      if (lower.startsWith('observaciones:')) return false;

      return true;
    });

    const joined = filtered.join('\n').trim();
    if (!joined) return '';

    const falla = this.extractDescripcionFallaFromLegacy(raw);
    if (joined === falla) return '';

    return this.cleanObservacionesText(joined);
  }

  private firstNonBlank<T = string>(...values: any[]): T | null {
    for (const value of values) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed as unknown as T;
      } else {
        return value as T;
      }
    }

    return null;
  }

  private guardarVinculoTicketOtEnCache(ticketId: string, otId: string): void {
    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[ticketId] = otId;
      localStorage.setItem(this.ticketOtCacheKey, JSON.stringify(map));
    } catch {
      // silencioso
    }
  }
}