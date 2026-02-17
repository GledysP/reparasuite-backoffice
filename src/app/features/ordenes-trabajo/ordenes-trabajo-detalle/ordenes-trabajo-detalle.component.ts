import { Component, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';

import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { EstadoOt } from '../../../core/models/enums';
import { OtDetalle, CitaDto } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-detalle',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
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
    MatTabsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatListModule
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // ✅ IMPORTANTE: fb antes de usarlo en inicializadores de forms
  private fb = inject(FormBuilder);

  @ViewChild('imageModal') imageModal!: TemplateRef<any>;

  id = this.route.snapshot.paramMap.get('id')!;

  loading = signal(false);
  busy = signal(false);

  ot = signal<OtDetalle | null>(null);
  selectedImageUrl = signal<string>('');

  estados: EstadoOt[] = ['RECIBIDA', 'PRESUPUESTO', 'APROBADA', 'EN_CURSO', 'FINALIZADA', 'CERRADA'];

  // ---- Form: cambiar estado
  formEstado = this.fb.group({
    estado: [null as EstadoOt | null, Validators.required]
  });

  // ---- Form: nota
  formNota = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]]
  });

  // ---- Form: presupuesto
  formPresupuesto = this.fb.group({
    importe: [null as number | null, [Validators.required, Validators.min(0)]],
    detalle: ['', [Validators.required, Validators.minLength(3)]],
    aceptacionCheck: [true]
  });

  // ---- Form: pago comprobante
  pagoFile: File | null = null;

  // ---- Form: citas
  formCita = this.fb.group({
    inicio: ['', Validators.required], // datetime-local
    fin: ['', Validators.required],    // datetime-local
  });

  // ---- Form: mensajes
  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.ordenes.obtener(this.id).subscribe({
      next: (res) => {
        this.ot.set(res);

        // Estado actual en selector
        if (res.estado) this.formEstado.controls.estado.setValue(res.estado as EstadoOt);

        // Precargar presupuesto si existe (sin “machacar” input del usuario)
        if (res.presupuesto) {
          const p = res.presupuesto;
          this.formPresupuesto.patchValue({
            importe: p.importe ?? null,
            detalle: p.detalle ?? '',
            aceptacionCheck: !!p.aceptacionCheck
          }, { emitEvent: false });
        }
      },
      error: () => {
        this.snack.open('Error al cargar la orden', 'OK', { duration: 2500 });
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  // -------------------------
  // Estado
  // -------------------------
  cambiarEstado(forzado?: EstadoOt): void {
    const estadoFinal = forzado ?? this.formEstado.controls.estado.value;
    if (!estadoFinal) return;

    this.busy.set(true);
    this.ordenes.cambiarEstado(this.id, estadoFinal).subscribe({
      next: () => {
        this.snack.open('Estado actualizado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al actualizar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // -------------------------
  // Notas
  // -------------------------
  anadirNota(): void {
    if (this.formNota.invalid) return;

    const contenido = (this.formNota.controls.contenido.value ?? '').trim();
    if (!contenido) return;

    this.busy.set(true);
    this.ordenes.anadirNota(this.id, contenido).subscribe({
      next: () => {
        this.formNota.reset();
        this.snack.open('Nota añadida', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al añadir nota', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // -------------------------
  // Fotos
  // -------------------------
  verFoto(foto: any): void {
    const url = foto?.url || foto;
    this.selectedImageUrl.set(url);
    this.dialog.open(this.imageModal, { width: 'auto', maxWidth: '92vw' });
  }

  onFotoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.busy.set(true);
    this.ordenes.subirFoto(this.id, file).subscribe({
      next: () => {
        this.snack.open('Foto subida', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al subir foto', 'OK', { duration: 2500 }),
      complete: () => {
        this.busy.set(false);
        input.value = '';
      }
    });
  }

  // -------------------------
  // Presupuesto
  // -------------------------
  crearPresupuesto(): void {
    if (this.formPresupuesto.invalid) {
      this.snack.open('Revisa importe y detalle', 'OK', { duration: 2500 });
      return;
    }

    const v = this.formPresupuesto.getRawValue();
    const body = {
      importe: Number(v.importe ?? 0),
      detalle: (v.detalle ?? '').trim(),
      aceptacionCheck: !!v.aceptacionCheck
    };

    this.busy.set(true);
    this.ordenes.crearPresupuesto(this.id, body).subscribe({
      next: () => {
        this.snack.open('Presupuesto guardado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al guardar presupuesto', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  enviarPresupuesto(): void {
    this.busy.set(true);
    this.ordenes.enviarPresupuesto(this.id).subscribe({
      next: () => {
        this.snack.open('Presupuesto enviado al cliente', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al enviar presupuesto', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  aceptarPresupuesto(): void {
    this.busy.set(true);
    this.ordenes.aceptarPresupuesto(this.id).subscribe({
      next: () => {
        this.snack.open('Presupuesto aceptado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al aceptar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  rechazarPresupuesto(): void {
    this.busy.set(true);
    this.ordenes.rechazarPresupuesto(this.id).subscribe({
      next: () => {
        this.snack.open('Presupuesto rechazado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al rechazar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // -------------------------
  // Pago
  // -------------------------
  marcarTransferencia(): void {
    this.busy.set(true);
    this.ordenes.marcarTransferencia(this.id).subscribe({
      next: () => {
        this.snack.open('Marcado como transferencia', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al marcar transferencia', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  onPagoFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.pagoFile = input.files?.[0] ?? null;

    // ✅ permite volver a seleccionar el mismo archivo
    input.value = '';
  }

  subirComprobante(): void {
    if (!this.pagoFile) return;

    this.busy.set(true);
    this.ordenes.subirComprobante(this.id, this.pagoFile).subscribe({
      next: () => {
        this.snack.open('Comprobante subido', 'OK', { duration: 2000 });
        this.pagoFile = null;
        this.cargar();
      },
      error: () => this.snack.open('Error al subir comprobante', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // -------------------------
  // Citas
  // -------------------------
  crearCita(): void {
    if (this.formCita.invalid) {
      this.snack.open('Selecciona inicio y fin', 'OK', { duration: 2500 });
      return;
    }
    const v = this.formCita.getRawValue();
    const inicioIso = this.toIso(v.inicio!);
    const finIso = this.toIso(v.fin!);

    this.busy.set(true);
    this.ordenes.crearCita(this.id, { inicio: inicioIso, fin: finIso }).subscribe({
      next: () => {
        this.snack.open('Cita creada', 'OK', { duration: 2000 });
        this.formCita.reset();
        this.cargar();
      },
      error: () => this.snack.open('Error al crear cita', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  reprogramarPrimera(): void {
    const data = this.ot();
    const first: CitaDto | undefined = data?.citas?.[0];
    if (!first) {
      this.snack.open('No hay citas para reprogramar', 'OK', { duration: 2200 });
      return;
    }
    if (this.formCita.invalid) {
      this.snack.open('Selecciona inicio y fin', 'OK', { duration: 2500 });
      return;
    }

    const v = this.formCita.getRawValue();
    const inicioIso = this.toIso(v.inicio!);
    const finIso = this.toIso(v.fin!);

    this.busy.set(true);
    this.ordenes.reprogramarCita(first.id, { inicio: inicioIso, fin: finIso }).subscribe({
      next: () => {
        this.snack.open('Cita reprogramada', 'OK', { duration: 2000 });
        this.formCita.reset();
        this.cargar();
      },
      error: () => this.snack.open('Error al reprogramar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // -------------------------
  // Mensajes
  // -------------------------
  enviarMensaje(): void {
    if (this.formMsg.invalid) return;

    const contenido = (this.formMsg.controls.contenido.value ?? '').trim();
    if (!contenido) return;

    this.busy.set(true);

    // ✅ FIX: firma segura (service suele pedir { contenido })
    this.ordenes.enviarMensaje(this.id, contenido).subscribe({

      next: () => {
        this.formMsg.reset();
        this.snack.open('Mensaje enviado', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: () => this.snack.open('Error al enviar mensaje', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  // Helpers
  private toIso(dtLocal: string): string {
    // dtLocal viene como "YYYY-MM-DDTHH:mm"
    return new Date(dtLocal).toISOString();
  }
}
