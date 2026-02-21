import { Component, OnInit, TemplateRef, ViewChild, ElementRef, inject, signal } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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
    MatDividerModule,
    MatProgressBarModule,
    MatCheckboxModule,

    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './ordenes-trabajo-detalle.component.html',
  styleUrl: './ordenes-trabajo-detalle.component.scss',
})
export class OrdenesTrabajoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenes = inject(OrdenesTrabajoService);
  private usuarios = inject(UsuariosService);
  private snack = inject(MatSnackBar);
  public dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  @ViewChild('imageModal') imageModal!: TemplateRef<any>;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;

  id = this.route.snapshot.paramMap.get('id')!;

  loading = signal(false);
  busy = signal(false);

  ot = signal<OtDetalle | null>(null);

  tecnicos = signal<UsuarioResumen[]>([]);
  tecnicoNombre = signal<string>('Sin asignar');

  selectedImageUrl = signal<string>('');

  readonly estados: EstadoOt[] = ['RECIBIDA', 'PRESUPUESTO', 'APROBADA', 'EN_CURSO', 'FINALIZADA', 'CERRADA'];

  formEstado = this.fb.group({
    estado: [null as EstadoOt | null, Validators.required]
  });

  formNota = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]]
  });

  formPresupuesto = this.fb.group({
    importe: [null as number | null, [Validators.required, Validators.min(0)]],
    detalle: ['', [Validators.required, Validators.minLength(3)]],
    aceptacionCheck: [true]
  });

  formCita = this.fb.group({
    fechaInicio: [null as Date | null, Validators.required],
    horaInicio: ['', Validators.required],
  });

  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    this.usuarios.listar(true).subscribe({
      next: (u) => {
        this.tecnicos.set(u.filter(x => x.rol === 'TECNICO'));
        this.cargar();
      },
      error: () => {
        this.tecnicos.set([]);
        this.cargar();
      }
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.ordenes.obtener(this.id).subscribe({
      next: (res) => {
        this.ot.set(res);

        if (res.estado) this.formEstado.controls.estado.setValue(res.estado as EstadoOt);

        if (res.presupuesto) {
          this.formPresupuesto.patchValue({
            importe: res.presupuesto.importe ?? null,
            detalle: res.presupuesto.detalle ?? '',
            aceptacionCheck: !!res.presupuesto.aceptacionCheck
          }, { emitEvent: false });
        }

        this.resolveTecnicoNombre(res);

        queueMicrotask(() => this.scrollChatToBottom());
        setTimeout(() => this.scrollChatToBottom(), 0);
      },
      error: () => {
        this.snack.open('Error al cargar la orden', 'OK', { duration: 2500 });
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  private scrollChatToBottom(): void {
    const el = this.chatScroll?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  private resolveTecnicoNombre(res: OtDetalle) {
    if (res.tecnico && typeof res.tecnico === 'object' && (res.tecnico as any).nombre) {
      this.tecnicoNombre.set((res.tecnico as any).nombre);
      return;
    }
    const tId = typeof (res as any).tecnico === 'string' ? (res as any).tecnico : (res as any).tecnicoId;
    if (tId) {
      const match = this.tecnicos().find(t => t.id === tId);
      if (match) {
        this.tecnicoNombre.set(match.nombre);
        return;
      }
    }
    this.tecnicoNombre.set('Sin asignar');
  }

  asignarTecnico(tecnicoId: string | null): void {
    console.log('Asignación manual no implementada en el service:', tecnicoId);
  }

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

  verFoto(foto: any): void {
    const url = foto?.url || foto;
    this.selectedImageUrl.set(url ?? '');
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

  guardarPresupuesto(): void {
    if (this.formPresupuesto.invalid) return;

    const v = this.formPresupuesto.getRawValue();
    this.busy.set(true);
    this.ordenes.crearPresupuesto(this.id, {
      importe: Number(v.importe ?? 0),
      detalle: (v.detalle ?? '').trim(),
      aceptacionCheck: !!v.aceptacionCheck
    }).subscribe({
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
        this.snack.open('Presupuesto enviado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al enviar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  marcarTransferencia(): void {
    this.busy.set(true);
    this.ordenes.marcarTransferencia(this.id).subscribe({
      next: () => {
        this.snack.open('Pago por transferencia registrado', 'OK', { duration: 2000 });
        this.cargar();
      },
      error: () => this.snack.open('Error al marcar pago', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  crearCita(): void {
    if (this.formCita.invalid) return;
    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);
    this.ordenes.crearCita(this.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) }).subscribe({
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
    const first = this.ot()?.citas?.[0];
    if (!first || this.formCita.invalid) return;

    const inicioIso = this.getInicioIso();
    if (!inicioIso) return;

    this.busy.set(true);
    this.ordenes.reprogramarCita(first.id, { inicio: inicioIso, fin: this.addMinutesIso(inicioIso, 60) }).subscribe({
      next: () => {
        this.snack.open('Cita reprogramada', 'OK', { duration: 2000 });
        this.formCita.reset();
        this.cargar();
      },
      error: () => this.snack.open('Error al reprogramar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
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
    if (this.formMsg.invalid) return;
    const contenido = (this.formMsg.controls.contenido.value ?? '').trim();
    if (!contenido) return;

    this.busy.set(true);
    this.ordenes.enviarMensaje(this.id, contenido).subscribe({
      next: () => {
        this.formMsg.reset();
        this.snack.open('Mensaje enviado', 'OK', { duration: 1500 });
        this.cargar();
        queueMicrotask(() => this.scrollChatToBottom());
      },
      error: () => this.snack.open('Error al enviar', 'OK', { duration: 2500 }),
      complete: () => this.busy.set(false)
    });
  }

  onMsgKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.enviarMensaje();
    }
  }

  trackById(index: number, item: any): any {
    return item?.id ?? index;
  }
}