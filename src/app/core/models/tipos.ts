// src/app/core/models/tipos.ts
import type { EstadoOt, PrioridadOt, RolUsuario, TipoOt } from './enums';

export type { EstadoOt, PrioridadOt, RolUsuario, TipoOt };

// ✅ FIX: necesario para Ajustes (TS2305)
export interface AjustesTaller {
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  prefijoOt: string;
}

export interface UsuarioResumen {
  id: string;
  nombre: string;
  usuario?: string;
  email?: string;
  rol: RolUsuario | string;
  activo?: boolean;
}

export interface ClienteResumen {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export interface OtListaItem {
  id: string;
  codigo: string;
  estado: EstadoOt | string;
  tipo: TipoOt | string;
  prioridad: PrioridadOt | string;
  clienteNombre: string;
  tecnicoNombre: string | null;
  updatedAt: string;
}

export interface NotaOt {
  id: string;
  contenido: string;
  createdAt: string;
}

export interface FotoOt {
  id: string;
  url: string;
  createdAt: string;
}

export interface HistorialItem {
  fecha: string;
  evento: string;
  descripcion: string;
  usuario: { nombre: string } | null;
}

export interface PresupuestoDto {
  id: string;
  estado: string;            // BORRADOR | ENVIADO | ACEPTADO | RECHAZADO (según tu backend)
  importe: number;
  detalle: string;
  aceptacionCheck: boolean;
  sentAt: string | null;
  respondedAt: string | null;
}

export interface PagoDto {
  id: string;
  estado: string;           // PENDIENTE | TRANSFERENCIA | ...
  importe: number;
  comprobanteUrl: string | null;
}

export interface CitaDto {
  id: string;
  inicio: string;
  fin: string;
  estado: string;          // PROGRAMADA / ...
}

export interface MensajeOtDto {
  id: string;
  remitenteTipo: string;   // CLIENTE / TALLER
  remitenteNombre: string;
  contenido: string;
  createdAt: string;
}

export interface OtDetalle {
  id: string;
  codigo: string;
  estado: EstadoOt | string;
  tipo: TipoOt | string;
  prioridad: PrioridadOt | string;
  descripcion: string;

  cliente: ClienteResumen;
  tecnico: UsuarioResumen | null;

  fechaPrevista: string | null;
  direccion: string | null;
  notasAcceso: string | null;

  notas: NotaOt[];
  fotos: FotoOt[];
  historial: HistorialItem[];

  presupuesto: PresupuestoDto | null;
  pago: PagoDto | null;
  citas: CitaDto[];
  mensajes: MensajeOtDto[];

  createdAt: string;
  updatedAt: string;
}

// Si lo usas en perfil cliente
export interface ClienteOrdenItem {
  id: string;
  codigo: string;
  estado: EstadoOt | string;
  tipo: TipoOt | string;
  updatedAt: string;
  tecnicoNombre: string | null;
}

export interface TicketListaItem {
  id: string;
  estado: string;
  asunto: string;
  updatedAt: string;
}


export interface TicketMensajeDto {
  id: string;
  remitenteTipo: string;   // CLIENTE / TALLER
  remitenteNombre: string;
  contenido: string;
  createdAt: string;
}

export interface TicketDetalleDto {
  id: string;
  estado: string;
  asunto: string;
  descripcion: string;
  mensajes: TicketMensajeDto[];
  createdAt: string;
  updatedAt: string;
  ordenTrabajoId?: string | null; // ✅ NUEVO
}

export interface TicketBackofficeListaItem {
  id: string;
  estado: string;
  asunto: string;
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string | null;
}

