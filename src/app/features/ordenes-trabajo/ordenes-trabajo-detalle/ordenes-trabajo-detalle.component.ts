import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { BreakpointObserver } from '@angular/cdk/layout';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { finalize, switchMap } from 'rxjs/operators';

import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { UsuariosService } from '../../usuarios/usuarios.service';

import { EstadoOt } from '../../../core/models/enums';
import { OtDetalle, UsuarioResumen } from '../../../core/models/tipos';

type UiAction =
  | 'estado'
  | 'cierre'
  | 'presupuesto'
  | 'enviar-presupuesto'
  | 'cita'
  | 'reprogramar'
  | 'mensaje'
  | 'nota'
  | 'pago'
  | 'foto'
  | 'recargar'
  | null;

type PeriodoHora = 'AM' | 'PM';

@Component({
  selector: 'rs-ordenes-trabajo-detalle',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRippleModule,
    MatTabsModule,
    MatTooltipModule,
    MatMenuModule,
    MatButtonToggleModule,
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private usuarios = inject(UsuariosService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private bp = inject(BreakpointObserver);

  @ViewChild('imageModal') imageModal!: TemplateRef<unknown>;
  @ViewChild('comprobanteModal') comprobanteModal!: TemplateRef<unknown>;
  @ViewChild('chatScroll') chatScrollEl?: ElementRef<HTMLDivElement>;

  id = '';
  isMobile = signal(false);

  loading = signal(false);
  busy = signal(false);
  actionInFlight = signal<UiAction>(null);

  ot = signal<OtDetalle | null>(null);

  tecnicos = signal<UsuarioResumen[]>([]);
  tecnicoNombre = signal<string>('Sin asignar');

  selectedImageUrl = signal<string>('');
  selectedComprobanteUrl = signal<string>('');

  closeSuccess = signal(false);

  editBudget = signal(false);
  editCita = signal(false);
  private firstLoad = true;

  private refreshTimer: number | null = null;

  readonly estados: EstadoOt[] = ['RECIBIDA', 'PRESUPUESTO', 'APROBADA', 'EN_CURSO', 'FINALIZADA', 'CERRADA'];
  readonly periodos: PeriodoHora[] = ['AM', 'PM'];

  formEstado = this.fb.group({
    estado: [null as EstadoOt | null, Validators.required],
  });

  formPresupuesto = this.fb.group({
    importe: [null as number | null, [Validators.required, Validators.min(0)]],
    detalle: ['', [Validators.required, Validators.minLength(3)]],
    aceptacionCheck: [true],
  });

  private horaFlexibleValidator = (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '').trim();
    if (!v) return null;
    return this.normalizeHora(v) ? null : { hora: true };
  };

  formCita = this.fb.group({
    fechaInicio: [null as Date | null, Validators.required],
    horaInicio: ['09:00', [Validators.required, this.horaFlexibleValidator]],
    periodo: ['AM' as PeriodoHora, Validators.required],
  });

  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]],
  });

  formNota = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly tieneCita = computed(() => (this.ot()?.citas?.length ?? 0) > 0);

  readonly pagoConfirmado = computed(() => {
    const estado = (this.ot()?.pago?.estado ?? '').toUpperCase();
    return ['PAGADO', 'CONFIRMADO', 'RECIBIDO'].includes(estado);
  });

  readonly pagoLabel = computed(() => {
    if (!this.ot()?.pago) return 'PENDIENTE';
    if (this.pagoConfirmado()) return 'PAGADO';
    const st = (this.ot()?.pago?.estado ?? '').toUpperCase().trim();
    return st || 'PENDIENTE';
  });

  readonly presupuestoEstado = computed(() => this.ot()?.presupuesto?.estado ?? 'SIN_PRESUPUESTO');
  readonly presupuestoImporte = computed(() => this.ot()?.presupuesto?.importe ?? null);
  readonly presupuestoEnviado = computed(() => String(this.presupuestoEstado()).toUpperCase() === 'ENVIADO');
  readonly presupuestoAceptado = computed(() => String(this.presupuestoEstado()).toUpperCase() === 'ACEPTADO');

  readonly proximaCita = computed(() => (this.ot()?.citas?.length ? this.ot()!.citas[0] : null));
  readonly totalPresupuesto = computed(() => this.ot()?.presupuesto?.importe ?? null);

  readonly historialPreview = computed(() => (this.ot()?.historial ?? []).slice(0, 6));

  readonly otNumber = computed(() => {
    const codigo = this.ot()?.codigo ?? '';
    if (!codigo) return '—';
    const cleaned = codigo.replace(/^OT[-\s]?/i, '').replace(/^#/, '').trim();
    return cleaned || codigo;
  });

  ngOnInit(): void {
    this.bp.observe('(max-width: 900px)').subscribe((r) => this.isMobile.set(r.matches));

    this.route.paramMap.subscribe((pm) => {
      this.id = pm.get('id') ?? '';
      if (this.id) this.cargar();
    });

    this.usuarios.listar(true).subscribe({
      next: (u) => this.tecnicos.set(u.filter((x) => x.rol === 'TECNICO')),
      error: () => this.tecnicos.set([]),
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private toast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.snack.open(message, 'OK', {
      duration: type === 'error' ? 2600 : 2000,
      panelClass: ['rs-snack', `rs-snack--${type}`],
    });
  }

  private queueScrollChat(): void {
    window.setTimeout(() => this.scrollChatToBottom(), 0);
  }

  private scrollChatToBottom(): void {
    const el = this.chatScrollEl?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  private startAutoRefreshIfNeeded(res: OtDetalle): void {
    const otEstado = String(res.estado ?? '').toUpperCase();
    const presEstado = String(res.presupuesto?.estado ?? '').toUpperCase();
    const pagoEstado = String(res.pago?.estado ?? '').toUpperCase();

    const pagoOk = ['PAGADO', 'CONFIRMADO', 'RECIBIDO'].includes(pagoEstado);

    const presupuestoPendienteCliente = presEstado === 'ENVIADO' || otEstado === 'PRESUPUESTO';

    const pagoPendiente =
      (!!res.pago && !pagoOk) ||
      (!!res.pago?.comprobanteUrl && !pagoOk) ||
      pagoEstado === 'PENDIENTE';

    const should = presupuestoPendienteCliente || pagoPendiente;

    if (!should) {
      this.stopAutoRefresh();
      return;
    }

    if (this.refreshTimer) return;

    this.refreshTimer = window.setInterval(() => {
      if (this.loading() || this.busy()) return;
      if (this.editBudget() || this.editCita()) return;
      this.cargar('recargar');
    }, 12000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  estadoPretty(): string {
    const e = String(this.ot()?.estado ?? '').toUpperCase();
    return e ? e.replaceAll('_', ' ') : '—';
  }

  presupuestoSummary(): string {
    const st = String(this.presupuestoEstado()).toUpperCase();
    if (st === 'ACEPTADO') return 'ACEPTADO';
    if (st === 'ENVIADO') return 'ENVIADO';
    if (st === 'BORRADOR') return 'BORRADOR';
    if (st === 'SIN_PRESUPUESTO') return 'SIN_PRESUPUESTO';
    return this.presupuestoEstado();
  }

  closeButtonLabel(): string {
    if (this.ot()?.estado === 'CERRADA' || this.closeSuccess()) return 'Cerrada';
    if (this.busy() && this.actionInFlight() === 'cierre') return 'Cerrando…';
    return 'Cerrar';
  }

  cargar(action: UiAction = null): void {
    if (!this.id) return;

    if (action) this.actionInFlight.set(action);
    this.loading.set(true);

    this.ordenes
      .obtener(this.id)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          if (action) this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: (res) => {
          this.ot.set(res);

          this.startAutoRefreshIfNeeded(res);

          if (res.estado) {
            this.formEstado.controls.estado.setValue(res.estado as EstadoOt, { emitEvent: false });
          }

          if (res.presupuesto && !this.editBudget()) {
            this.formPresupuesto.patchValue(
              {
                importe: res.presupuesto.importe ?? null,
                detalle: res.presupuesto.detalle ?? '',
                aceptacionCheck: !!res.presupuesto.aceptacionCheck,
              },
              { emitEvent: false }
            );
          }

          const first = res.citas?.[0];
          if (first?.inicio && !this.editCita()) {
            const d = new Date(first.inicio);
            const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const hora24 = `${hh}:${mm}`;
            const periodo: PeriodoHora = d.getHours() >= 12 ? 'PM' : 'AM';
            this.formCita.patchValue({ fechaInicio: dateOnly, horaInicio: hora24, periodo }, { emitEvent: false });
          }

          this.resolveTecnicoNombre(res);

          if (this.firstLoad) {
            this.editBudget.set(false);
            this.editCita.set(false);
            this.firstLoad = false;
          }

          this.queueScrollChat();
        },
        error: () => this.toast('Error al cargar la orden', 'error'),
      });
  }

  recargarVista(): void {
    if (this.busy()) return;
    this.cargar('recargar');
  }

  private resolveTecnicoNombre(res: OtDetalle): void {
    if (res.tecnico?.nombre) {
      this.tecnicoNombre.set(res.tecnico.nombre);
      return;
    }
    this.tecnicoNombre.set('Sin asignar');
  }

  toggleBudgetEdit(): void {
    this.editBudget.set(!this.editBudget());
  }

  toggleCitaEdit(): void {
    this.editCita.set(!this.editCita());
  }

  selectEstadoFromMenu(estado: EstadoOt): void {
    this.cambiarEstado(estado);
  }

  cambiarEstado(estadoForzado?: EstadoOt): void {
    const estado = estadoForzado ?? this.formEstado.controls.estado.value;
    if (!estado || !this.id) return;

    this.busy.set(true);
    this.actionInFlight.set('estado');

    this.ordenes
      .cambiarEstado(this.id, estado)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Estado actualizado', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al actualizar estado', 'error'),
      });
  }

  cerrarOt(): void {
    const data = this.ot();
    if (!this.id || !data || data.estado === 'CERRADA') return;

    this.busy.set(true);
    this.actionInFlight.set('cierre');

    this.ordenes
      .cambiarEstado(this.id, 'CERRADA')
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.closeSuccess.set(true);
          window.setTimeout(() => this.closeSuccess.set(false), 1800);
          this.toast('Orden cerrada', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al cerrar la orden', 'error'),
      });
  }

  guardarPresupuesto(): void {
    if (this.formPresupuesto.invalid || !this.id) return;

    const v = this.formPresupuesto.getRawValue();
    this.busy.set(true);
    this.actionInFlight.set('presupuesto');

    this.ordenes
      .crearPresupuesto(this.id, {
        importe: Number(v.importe ?? 0),
        detalle: (v.detalle ?? '').trim(),
        aceptacionCheck: !!v.aceptacionCheck,
      })
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Presupuesto guardado', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al guardar presupuesto', 'error'),
      });
  }

  enviarPresupuesto(): void {
    if (!this.id) return;

    if (this.formPresupuesto.invalid) {
      this.formPresupuesto.markAllAsTouched();
      this.toast('Completa importe y detalle antes de enviar', 'error');
      return;
    }

    const v = this.formPresupuesto.getRawValue();

    this.busy.set(true);
    this.actionInFlight.set('enviar-presupuesto');

    this.ordenes
      .crearPresupuesto(this.id, {
        importe: Number(v.importe ?? 0),
        detalle: (v.detalle ?? '').trim(),
        aceptacionCheck: !!v.aceptacionCheck,
      })
      .pipe(
        switchMap(() => this.ordenes.enviarPresupuesto(this.id)),
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Presupuesto enviado', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al enviar presupuesto', 'error'),
      });
  }

  crearCita(): void {
    if (this.formCita.invalid || !this.id) return;

    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);
    this.actionInFlight.set('cita');

    this.ordenes
      .crearCita(this.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) })
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Cita programada', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al programar cita', 'error'),
      });
  }

  reprogramarPrimera(): void {
    const first = this.ot()?.citas?.[0];
    if (!first || this.formCita.invalid) return;

    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);
    this.actionInFlight.set('reprogramar');

    this.ordenes
      .reprogramarCita(first.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) })
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Cita reprogramada', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al reprogramar cita', 'error'),
      });
  }

  onHoraInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    let digits = (input.value ?? '').replace(/[^\d]/g, '');
    if (digits.length > 4) digits = digits.slice(0, 4);

    let display = digits;
    if (digits.length === 3) display = `${digits.slice(0, 1)}:${digits.slice(1)}`;
    if (digits.length === 4) display = `${digits.slice(0, 2)}:${digits.slice(2)}`;

    input.value = display;
    this.formCita.controls.horaInicio.setValue(display, { emitEvent: false });
  }

  onHoraBlur(): void {
    const raw = String(this.formCita.controls.horaInicio.value ?? '');
    const norm = this.normalizeHora(raw);
    if (norm) this.formCita.controls.horaInicio.setValue(norm, { emitEvent: false });
  }

  private normalizeHora(value: string): string | null {
    const s = (value || '').trim();
    if (!s) return null;

    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return s;

    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return null;

    let hh = '';
    let mm = '';

    if (digits.length <= 2) {
      hh = digits;
      mm = '00';
    } else if (digits.length === 3) {
      hh = digits.slice(0, 1);
      mm = digits.slice(1, 3);
    } else {
      hh = digits.slice(0, 2);
      mm = digits.slice(2, 4);
    }

    const h = Number(hh);
    const m = Number(mm);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private getInicioIso(): string | null {
    const v = this.formCita.getRawValue();
    if (!v.fechaInicio || !v.horaInicio) return null;

    const norm = this.normalizeHora(String(v.horaInicio));
    if (!norm) return null;

    const [hStr, mStr] = norm.split(':');
    let h = Number(hStr);
    const m = Number(mStr);

    if (h >= 1 && h <= 12) {
      const periodo = v.periodo ?? 'AM';
      const h12 = Number(hStr);
      if (periodo === 'AM') h = h12 === 12 ? 0 : h12;
      else h = h12 === 12 ? 12 : h12 + 12;
    }

    const d = new Date(v.fechaInicio);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  private addMinutesIso(iso: string, minutes: number): string {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }

  enviarMensaje(): void {
    if (this.formMsg.invalid || !this.id) return;

    const contenido = (this.formMsg.controls.contenido.value ?? '').trim();
    if (!contenido) return;

    this.busy.set(true);
    this.actionInFlight.set('mensaje');

    this.ordenes
      .enviarMensaje(this.id, contenido)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.formMsg.reset({ contenido: '' });
          this.toast('Mensaje enviado', 'success');
          this.cargar();
          this.queueScrollChat();
        },
        error: () => this.toast('Error al enviar mensaje', 'error'),
      });
  }

  onMsgKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.enviarMensaje();
    }
  }

  anadirNota(): void {
    if (this.formNota.invalid || !this.id) return;

    const contenido = (this.formNota.controls.contenido.value ?? '').trim();
    if (!contenido) return;

    this.busy.set(true);
    this.actionInFlight.set('nota');

    this.ordenes
      .anadirNota(this.id, contenido)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.formNota.reset({ contenido: '' });
          this.toast('Nota añadida', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al añadir nota', 'error'),
      });
  }

  marcarTransferencia(): void {
    if (!this.id || this.pagoConfirmado()) return;

    this.busy.set(true);
    this.actionInFlight.set('pago');

    this.ordenes
      .confirmarPagoRecibido(this.id)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.toast('Pago marcado como pagado', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al marcar pagado', 'error'),
      });
  }

  onFotoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.id) return;

    this.busy.set(true);
    this.actionInFlight.set('foto');

    this.ordenes
      .subirFoto(this.id, file)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.actionInFlight.set(null);
          input.value = '';
        })
      )
      .subscribe({
        next: () => {
          this.toast('Foto subida', 'success');
          this.cargar();
        },
        error: () => this.toast('Error al subir foto', 'error'),
      });
  }

  // ✅ FIX URLs /files/**
  fileUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }

  verFoto(foto: any): void {
    const url = this.fileUrl(foto?.url || foto);
    this.selectedImageUrl.set(url ?? '');
    this.dialog.open(this.imageModal, { width: 'auto', maxWidth: '92vw' });
  }

  verComprobante(url?: string | null): void {
    if (!url) return;
    this.selectedComprobanteUrl.set(this.fileUrl(url));
    this.dialog.open(this.comprobanteModal, { width: 'auto', maxWidth: '94vw' });
  }

  closeModal(): void {
    this.dialog.closeAll();
  }

  trackById(index: number, item: any): any {
    return item?.id ?? index;
  }
}