import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import { ClienteResumen, TicketDetalleDto, UsuarioResumen } from '../../../core/models/tipos';

import { TicketsService } from '../../tickets/tickets.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { ClienteBuscarDialogComponent } from './cliente-buscar-dialog.component';
import { OrdenesTrabajoService, OtCrearRequest } from '../ordenes-trabajo.service';

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
    NgIf,
    NgFor,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './ordenes-trabajo-nueva.component.html',
  styleUrl: './ordenes-trabajo-nueva.component.scss'
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

  private subs = new Subscription();
  private readonly ticketOtCacheKey = 'rs_ticket_ot_map';

  tecnicos: UsuarioResumen[] = [];
  prioridades: PrioridadOt[] = ['BAJA', 'MEDIA', 'ALTA'];

  clienteId: string | null = null;
  fromTicket = false;

  fotos: File[] = [];
  fotoPreviews: FotoPreview[] = [];
  isDragOver = false;
  guardando = false;

  ticketId: string | null = null;
  ticketRef: TicketSummaryRef | null = null;

  previewTicketAbierto = false;
  previewTicketUrl = '';

  form = this.fb.group({
    clienteNombre: this.fb.nonNullable.control('', [Validators.required]),
    clienteTelefono: this.fb.nonNullable.control(''),
    clienteEmail: this.fb.nonNullable.control(''),

    tipo: this.fb.nonNullable.control<TipoOt>('TIENDA', [Validators.required]),
    direccion: this.fb.nonNullable.control(''),
    notasAcceso: this.fb.nonNullable.control(''),

    fechaRecepcion: this.fb.control<Date | null>(null),

    fechaCita: this.fb.control<Date | null>(null),
    horaCita: this.fb.nonNullable.control('09:00', [
      Validators.required,
      Validators.pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]$/)
    ]),
    periodoCita: this.fb.nonNullable.control<PeriodoHora>('AM'),

    fechaPrevista: this.fb.control<string | null>(null),

    equipo: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    descripcion: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),

    observaciones: this.fb.nonNullable.control(''),

    prioridad: this.fb.nonNullable.control<PrioridadOt>('MEDIA'),
    tecnicoId: this.fb.control<string | null>(null)
  });

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.queryParamMap.get('ticketId');
    this.fromTicket = this.route.snapshot.queryParamMap.get('fromTicket') === '1';

    this.loadTecnicos();
    this.setupPrefillFromQueryParams();
    this.setupTipoRules();

    if (this.ticketId) {
      this.cargarTicketParaPrefill(this.ticketId);
      this.cargarTicketFotosReferencia(this.ticketId);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearPreviews();
  }

  get isDomicilio(): boolean {
    return this.form.controls.tipo.value === 'DOMICILIO';
  }

  get hasTicketPhotoRefs(): boolean {
    return this.fotoPreviews.some(p => p.source === 'ticket');
  }

  get ticketPhotoRefs(): FotoPreview[] {
    return this.fotoPreviews.filter(p => p.source === 'ticket');
  }

  get localPhotoPreviews(): FotoPreview[] {
    return this.fotoPreviews.filter(p => p.source === 'local');
  }

  get selectedFileName(): string | null {
    if (this.fotos.length === 0) return null;
    return this.fotos.length === 1
      ? this.fotos[0].name
      : `${this.fotos.length} archivos seleccionados`;
  }

  get observacionesOriginales(): string {
    return (this.ticketRef?.observacionesOriginales || '').trim();
  }

  abrirPreviewTicket(p: FotoPreview): void {
    this.previewTicketUrl = p.url;
    this.previewTicketAbierto = true;
  }

  cerrarPreviewTicket(): void {
    this.previewTicketAbierto = false;
    this.previewTicketUrl = '';
  }

  private loadTecnicos(): void {
    this.subs.add(
      this.usuarios.listar(true).subscribe(u => {
        this.tecnicos = u.filter(x => x.rol === 'TECNICO');
      })
    );
  }

  private setupPrefillFromQueryParams(): void {
    this.subs.add(
      this.route.queryParamMap.subscribe(qp => {
        const clienteId = qp.get('clienteId');
        const clienteNombre = qp.get('clienteNombre');
        const clienteTelefono = qp.get('clienteTelefono');
        const clienteEmail = qp.get('clienteEmail');

        const tipo = qp.get('tipo') as TipoOt | null;
        const direccion = qp.get('direccion');

        const equipo = qp.get('equipo') || qp.get('asunto');
        const descripcionFalla = qp.get('descripcionFalla');
        const descripcionLegacy = qp.get('descripcion');

        const descripcionLimpia = this.buildDescripcionTrabajoPrefill(
          descripcionFalla,
          descripcionLegacy
        );

        const obsQP = (
          qp.get('observaciones') ||
          qp.get('detalleAdicional') ||
          qp.get('comentarios') ||
          ''
        ).trim();

        if (clienteId) this.clienteId = clienteId;

        this.form.patchValue({
          clienteNombre: clienteNombre || this.form.controls.clienteNombre.value || '',
          clienteTelefono: clienteTelefono || this.form.controls.clienteTelefono.value || '',
          clienteEmail: clienteEmail || this.form.controls.clienteEmail.value || '',
          tipo:
            tipo === 'DOMICILIO' || tipo === 'TIENDA'
              ? tipo
              : this.form.controls.tipo.value,
          direccion: direccion || this.form.controls.direccion.value || '',
          equipo: equipo || this.form.controls.equipo.value || '',
          descripcion: descripcionLimpia || this.form.controls.descripcion.value || '',
          observaciones: obsQP || this.form.controls.observaciones.value || ''
        }, { emitEvent: false });

        if (this.fromTicket || this.ticketId) {
          this.ticketRef = {
            id: this.ticketId || '',
            equipo: equipo || null,
            asunto: qp.get('asunto'),
            descripcionFalla: descripcionLimpia || null,
            observacionesOriginales: obsQP || null,
            tipoServicioSugerido:
              tipo === 'DOMICILIO' || tipo === 'TIENDA' ? tipo : null,
            direccion: direccion || null
          };
        }

        this.applyTipoValidators();
        this.syncFechaPrevista();
      })
    );
  }

  private setupTipoRules(): void {
    this.subs.add(
      this.form.controls.tipo.valueChanges.subscribe(() => {
        this.applyTipoValidators();

        if (this.isDomicilio) {
          this.form.controls.fechaRecepcion.setValue(null, { emitEvent: false });
        } else {
          this.form.controls.fechaCita.setValue(null, { emitEvent: false });
          this.form.controls.horaCita.setValue('09:00', { emitEvent: false });
          this.form.controls.periodoCita.setValue('AM', { emitEvent: false });
        }

        this.syncFechaPrevista();
      })
    );

    this.subs.add(this.form.controls.fechaRecepcion.valueChanges.subscribe(() => this.syncFechaPrevista()));
    this.subs.add(this.form.controls.fechaCita.valueChanges.subscribe(() => this.syncFechaPrevista()));
    this.subs.add(this.form.controls.horaCita.valueChanges.subscribe(() => this.syncFechaPrevista()));
    this.subs.add(this.form.controls.periodoCita.valueChanges.subscribe(() => this.syncFechaPrevista()));

    this.applyTipoValidators();
    this.syncFechaPrevista();
  }

  private applyTipoValidators(): void {
    if (this.isDomicilio) {
      this.form.controls.direccion.setValidators([Validators.required, Validators.minLength(4)]);
      this.form.controls.fechaCita.setValidators([Validators.required]);
      this.form.controls.horaCita.setValidators([
        Validators.required,
        Validators.pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]$/)
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

  private syncFechaPrevista(): void {
    let iso: string | null = null;

    if (this.isDomicilio) {
      const fecha = this.form.controls.fechaCita.value;
      const hora = this.form.controls.horaCita.value;
      const periodo = this.form.controls.periodoCita.value;

      if (fecha && hora) {
        const [hourStr, minuteStr] = hora.split(':');
        let hours = Number(hourStr);
        const minutes = Number(minuteStr || '0');

        if (periodo === 'PM' && hours < 12) hours += 12;
        if (periodo === 'AM' && hours === 12) hours = 0;

        const d = new Date(fecha);
        d.setHours(hours, minutes, 0, 0);

        if (!isNaN(d.getTime())) {
          iso = d.toISOString();
        }
      }
    } else {
      const fecha = this.form.controls.fechaRecepcion.value;

      if (fecha) {
        const d = new Date(fecha);
        d.setHours(9, 0, 0, 0);

        if (!isNaN(d.getTime())) {
          iso = d.toISOString();
        }
      }
    }

    this.form.controls.fechaPrevista.setValue(iso, { emitEvent: false });
  }

  private cargarTicketParaPrefill(ticketId: string): void {
    this.tickets.obtener(ticketId).subscribe({
      next: (t: TicketDetalleDto) => {
        const x = t as any;

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
        const obs = this.pickObservacionesOnly(x);

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

        this.form.patchValue({
          clienteNombre: this.firstNonBlank(x.clienteNombre, this.form.controls.clienteNombre.value) || '',
          clienteTelefono: this.firstNonBlank(x.clienteTelefono, this.form.controls.clienteTelefono.value) || '',
          clienteEmail: this.firstNonBlank(x.clienteEmail, this.form.controls.clienteEmail.value) || '',
          tipo:
            tipo === 'DOMICILIO' || tipo === 'TIENDA'
              ? tipo
              : this.form.controls.tipo.value,
          direccion: this.firstNonBlank(direccion, this.form.controls.direccion.value) || '',
          equipo: this.firstNonBlank(equipo, this.form.controls.equipo.value) || '',
          descripcion: this.firstNonBlank(descripcion, this.form.controls.descripcion.value) || '',
          observaciones: obs || ''
        }, { emitEvent: false });

        this.applyTipoValidators();
        this.syncFechaPrevista();
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

        const locals = this.fotoPreviews.filter(p => p.source === 'local');
        this.fotoPreviews = [...refs, ...locals];
      },
      error: () => {
        // silencioso
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

  private extractObservacionesFromDescription(text: string): string {
    const raw = (text || '').trim();
    if (!raw) return '';

    const directMatch = raw.match(/Observaciones:\s*([\s\S]*)$/i);
    if (directMatch?.[1]?.trim()) {
      return directMatch[1].trim();
    }

    const lines = raw
      .split(/\r?\n/)
      .map((x: string) => x.trim())
      .filter((x: string) => Boolean(x));

    if (!lines.length) return '';

    const filtered = lines.filter((ln: string) => {
      const s = ln.toLowerCase();

      if (s.startsWith('falla reportada:')) return false;
      if (s.startsWith('descripción de la falla:')) return false;
      if (s.startsWith('descripcion de la falla:')) return false;
      if (s.startsWith('tipo sugerido:')) return false;
      if (s.startsWith('dirección / ubicación:')) return false;
      if (s.startsWith('direccion / ubicacion:')) return false;
      if (s.startsWith('equipo:')) return false;
      if (s.startsWith('equipo / asunto:')) return false;
      if (s.startsWith('observaciones:')) return false;

      return true;
    });

    const joined = filtered.join('\n').trim();
    if (!joined) return '';

    const falla = this.extractDescripcionFallaFromLegacy(raw);
    if (joined === falla) return '';

    return joined;
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

    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }

  buscarCliente(): void {
    if (this.guardando) return;

    if (this.fromTicket && this.clienteId) {
      this.snack.open('Esta OT viene de un ticket. El cliente ya está vinculado.', 'OK', {
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
        if (cliente) {
          this.clienteId = cliente.id;
          this.form.patchValue({
            clienteNombre: cliente.nombre ?? '',
            clienteTelefono: cliente.telefono ?? '',
            clienteEmail: cliente.email ?? ''
          });
        }
      })
    );
  }

  irAClientes(): void {
    this.router.navigateByUrl('/clientes');
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver = false;
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver = false;

    const files = ev.dataTransfer?.files;
    if (files && files.length) {
      this.setFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      this.setFiles(Array.from(files));
    }

    input.value = '';
  }

  private setFiles(files: File[]): void {
    const onlyImages = files.filter(f => f.type.startsWith('image/'));

    if (!onlyImages.length) {
      this.snack.open('Selecciona imágenes válidas', 'OK', { duration: 2000 });
      return;
    }

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

  removeLocalFile(indexInLocalList: number): void {
    const locals = this.localPhotoPreviews;
    const target = locals[indexInLocalList];
    if (!target) return;

    if (target.url) URL.revokeObjectURL(target.url);

    this.fotos = this.fotos.filter((_, i) => i !== indexInLocalList);

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

  clearLocalFiles(): void {
    this.clearLocalPreviews();
    this.fotos = [];
  }

  clearPreviews(): void {
    this.fotoPreviews
      .filter(p => p.source === 'local')
      .forEach(p => {
        if (p.url) URL.revokeObjectURL(p.url);
      });

    this.fotoPreviews = [];
    this.fotos = [];
  }

  private clearLocalPreviews(): void {
    this.fotoPreviews
      .filter(p => p.source === 'local')
      .forEach(p => {
        if (p.url) URL.revokeObjectURL(p.url);
      });

    this.fotoPreviews = this.fotoPreviews.filter(p => p.source !== 'local');
  }

  crear(): void {
    if (this.guardando) return;

    this.syncFechaPrevista();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Por favor revisa los campos requeridos', 'OK', {
        duration: 2500
      });
      return;
    }

    const v = this.form.getRawValue();

    const descMain = (v.descripcion ?? '').trim();
    const obs = (v.observaciones ?? '').trim();

    let descripcionFinal = descMain;
    if (obs) {
      const normalizedMain = descMain.toLowerCase();
      const normalizedObs = obs.toLowerCase();

      if (!normalizedMain.includes(normalizedObs)) {
        descripcionFinal = descMain
          ? `${descMain}\n\nObservaciones: ${obs}`
          : obs;
      }
    }

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
      descripcion: descripcionFinal,
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

        if (!this.fotos.length) return of({ id });

        const uploads = this.fotos.map(file =>
          this.ordenes.subirFoto(id, file).pipe(
            catchError(err => {
              console.error('Error subiendo foto:', err);
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
        this.snack.open('¡Orden creada con éxito!', 'Cerrar', { duration: 2500 });
        this.clearLocalFiles();
        this.router.navigate(['/ordenes-trabajo', id]);
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Error al crear la orden', 'OK', {
          duration: 3000
        });
      }
    });
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

  private guardarVinculoTicketOtEnCache(ticketId: string, otId: string): void {
    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      const map = raw ? JSON.parse(raw) as Record<string, string> : {};
      map[ticketId] = otId;
      localStorage.setItem(this.ticketOtCacheKey, JSON.stringify(map));
    } catch {
      // silencioso
    }
  }
}