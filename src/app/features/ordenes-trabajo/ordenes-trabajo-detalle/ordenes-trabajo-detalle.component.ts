import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';

import { finalize } from 'rxjs/operators';

import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { UsuariosService } from '../../usuarios/usuarios.service';

import { EstadoOt } from '../../../core/models/enums';
import { OtDetalle, UsuarioResumen } from '../../../core/models/tipos';

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
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRippleModule,
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private usuarios = inject(UsuariosService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  @ViewChild('imageModal') imageModal!: TemplateRef<any>;
  @ViewChild('comprobanteModal') comprobanteModal!: TemplateRef<any>;

  id = this.route.snapshot.paramMap.get('id') ?? '';

  loading = signal(false);
  busy = signal(false);

  ot = signal<OtDetalle | null>(null);

  tecnicos = signal<UsuarioResumen[]>([]);
  tecnicoNombre = signal<string>('Sin asignar');

  selectedImageUrl = signal<string>('');
  selectedComprobanteUrl = signal<string>('');

  readonly estados: EstadoOt[] = ['RECIBIDA', 'PRESUPUESTO', 'APROBADA', 'EN_CURSO', 'FINALIZADA', 'CERRADA'];

  formEstado = this.fb.group({
    estado: [null as EstadoOt | null, Validators.required],
  });

  formPresupuesto = this.fb.group({
    importe: [null as number | null, [Validators.required, Validators.min(0)]],
    detalle: ['', [Validators.required, Validators.minLength(3)]],
    aceptacionCheck: [true],
  });

  formCita = this.fb.group({
    fechaInicio: [null as Date | null, Validators.required],
    horaInicio: ['', Validators.required],
  });

  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]],
  });

  formNota = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]],
  });

  // ✅ ya hay cita -> ocultar "Programar"
  tieneCita = computed(() => !!this.ot()?.citas?.length);

  // ✅ deshabilitar confirmar pago si ya está confirmado
  pagoConfirmado = computed(() => {
    const estado = (this.ot()?.pago?.estado ?? '').toUpperCase();
    return ['PAGADO', 'CONFIRMADO', 'RECIBIDO'].includes(estado);
  });

  ngOnInit(): void {
    this.usuarios.listar(true).subscribe({
      next: (u) => {
        this.tecnicos.set(u.filter((x) => x.rol === 'TECNICO'));
        this.cargar();
      },
      error: () => {
        this.tecnicos.set([]);
        this.cargar();
      },
    });
  }

  cargar(): void {
    if (!this.id) return;

    this.loading.set(true);

    this.ordenes
      .obtener(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.ot.set(res);

          if (res.estado) {
            this.formEstado.controls.estado.setValue(res.estado as EstadoOt, { emitEvent: false });
          }

          if (res.presupuesto) {
            this.formPresupuesto.patchValue(
              {
                importe: res.presupuesto.importe ?? null,
                detalle: res.presupuesto.detalle ?? '',
                aceptacionCheck: !!res.presupuesto.aceptacionCheck,
              },
              { emitEvent: false }
            );
          }

          this.resolveTecnicoNombre(res);

          const first = res.citas?.[0];
          if (first?.inicio) {
            const d = new Date(first.inicio);
            const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            this.formCita.patchValue(
              { fechaInicio: dateOnly, horaInicio: `${hh}:${mm}` },
              { emitEvent: false }
            );
          }
        },
        error: () => this.snack.open('Error al cargar la orden', 'OK', { duration: 2500 }),
      });
  }

  private resolveTecnicoNombre(res: OtDetalle): void {
    const tecnicoObj: any = (res as any).tecnico;

    if (tecnicoObj && typeof tecnicoObj === 'object' && tecnicoObj.nombre) {
      this.tecnicoNombre.set(tecnicoObj.nombre);
      return;
    }

    const tecnicoId = typeof tecnicoObj === 'string' ? tecnicoObj : (res as any).tecnicoId;
    if (tecnicoId) {
      const match = this.tecnicos().find((t) => t.id === tecnicoId);
      this.tecnicoNombre.set(match?.nombre ?? 'Sin asignar');
      return;
    }

    this.tecnicoNombre.set('Sin asignar');
  }

  cambiarEstado(estadoForzado?: EstadoOt): void {
    const estado = estadoForzado ?? this.formEstado.controls.estado.value;
    if (!estado || !this.id) return;

    this.busy.set(true);

    this.ordenes
      .cambiarEstado(this.id, estado)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Estado actualizado', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al actualizar estado', 'OK', { duration: 2500 }),
      });
  }

  guardarPresupuesto(): void {
    if (this.formPresupuesto.invalid || !this.id) return;

    const v = this.formPresupuesto.getRawValue();
    this.busy.set(true);

    this.ordenes
      .crearPresupuesto(this.id, {
        importe: Number(v.importe ?? 0),
        detalle: (v.detalle ?? '').trim(),
        aceptacionCheck: !!v.aceptacionCheck,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Presupuesto guardado', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al guardar presupuesto', 'OK', { duration: 2500 }),
      });
  }

  enviarPresupuesto(): void {
    if (!this.id) return;

    this.busy.set(true);

    this.ordenes
      .enviarPresupuesto(this.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Presupuesto enviado', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al enviar presupuesto', 'OK', { duration: 2500 }),
      });
  }

  crearCita(): void {
    if (this.formCita.invalid || !this.id) return;

    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);

    this.ordenes
      .crearCita(this.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Cita programada', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al programar cita', 'OK', { duration: 2500 }),
      });
  }

  reprogramarPrimera(): void {
    const first = this.ot()?.citas?.[0];
    if (!first || this.formCita.invalid) return;

    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);

    this.ordenes
      .reprogramarCita(first.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Cita reprogramada', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al reprogramar cita', 'OK', { duration: 2500 }),
      });
  }

  private getInicioIso(): string | null {
    const v = this.formCita.getRawValue();
    if (!v.fechaInicio || !v.horaInicio) return null;

    const [h, m] = v.horaInicio.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

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

    this.ordenes
      .enviarMensaje(this.id, contenido)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.formMsg.reset();
          this.snack.open('Mensaje enviado', 'OK', { duration: 1500 });
          this.cargar();
        },
        error: () => this.snack.open('Error al enviar mensaje', 'OK', { duration: 2500 }),
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

    this.ordenes
      .anadirNota(this.id, contenido)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.formNota.reset();
          this.snack.open('Nota añadida', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al añadir nota', 'OK', { duration: 2500 }),
      });
  }

  marcarTransferencia(): void {
    if (!this.id || this.pagoConfirmado()) return;

    this.busy.set(true);

    this.ordenes
      .confirmarPagoRecibido(this.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Pago confirmado por backoffice', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al confirmar pago', 'OK', { duration: 2500 }),
      });
  }

  onFotoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.id) return;

    this.busy.set(true);

    this.ordenes
      .subirFoto(this.id, file)
      .pipe(finalize(() => {
        this.busy.set(false);
        input.value = '';
      }))
      .subscribe({
        next: () => {
          this.snack.open('Foto subida', 'OK', { duration: 2000 });
          this.cargar();
        },
        error: () => this.snack.open('Error al subir foto', 'OK', { duration: 2500 }),
      });
  }

  verFoto(foto: any): void {
    const url = foto?.url || foto;
    this.selectedImageUrl.set(url ?? '');
    this.dialog.open(this.imageModal, { width: 'auto', maxWidth: '92vw' });
  }

  verComprobante(url?: string | null): void {
    if (!url) return;
    this.selectedComprobanteUrl.set(url);
    this.dialog.open(this.comprobanteModal, { width: 'auto', maxWidth: '92vw' });
  }

  closeModal(): void {
    this.dialog.closeAll();
  }

  trackById(index: number, item: any): any {
    return item?.id ?? index;
  }
}