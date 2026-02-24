import type { EstadoOt, PrioridadOt, RolUsuario, TipoOt } from './enums';

export type { EstadoOt, PrioridadOt, RolUsuario, TipoOt };

export interface ApiListaResponse<T> {
  items: T[];
  total: number;
}

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

  // ✅ nuevo (si backend ya lo devuelve)
  equipo?: string | null;

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
  estado: string;
  importe: number;
  detalle: string;
  aceptacionCheck: boolean;
  sentAt: string | null;
  respondedAt: string | null;
}

export interface PagoDto {
  id: string;
  estado: string;
  importe: number;
  comprobanteUrl: string | null;
}

export interface CitaDto {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
}

export interface MensajeOtDto {
  id: string;
  remitenteTipo: string;
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

  // ✅ nuevo
  equipo?: string | null;

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
  asunto: string; // ✅ en UI ticket = "Equipo"
  updatedAt: string;
}

export interface TicketMensajeDto {
  id: string;
  remitenteTipo: string;
  remitenteNombre: string;
  contenido: string;
  createdAt: string;
}

export interface TicketFotoDto {
  id: string;
  url: string;
  nombreOriginal?: string | null;
  createdAt: string;
}

export interface TicketDetalleDto {
  id: string;
  estado: string;

  // ✅ Lo mantenemos por compatibilidad backend, pero en UI lo tratamos como "equipo"
  asunto: string;

  descripcion: string;
  mensajes: TicketMensajeDto[];
  createdAt: string;
  updatedAt: string;
  ordenTrabajoId?: string | null;

  // ✅ snapshots / datos cliente
  clienteId?: string | null;
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;

  // ✅ estructurados (nombres reales backend)
  equipo?: string | null;
  descripcionFalla?: string | null;
  tipoServicioSugerido?: 'TIENDA' | 'DOMICILIO' | string | null;
  direccion?: string | null;

  // ✅ fotos (nuevo backend)
  fotos?: TicketFotoDto[];

  // compat legacy (por si en algún punto lo sigues usando)
  fotoUrl?: string | null;
  direccionSolicitud?: string | null;
  tipoServicioSolicitado?: 'TIENDA' | 'DOMICILIO' | string | null;
}

export interface TicketBackofficeListaItem {
  id: string;
  estado: string;
  asunto: string; // ✅ asunto = equipo en ticket
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string | null;
  ordenTrabajoId?: string | null;
}