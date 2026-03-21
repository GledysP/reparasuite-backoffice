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
  totalWos?: number | null;
  lastWoDate?: string | null;
}

export interface OtListaItem {
  id: string;
  codigo: string;
  estado: EstadoOt | string;
  tipo: TipoOt | string;
  prioridad: PrioridadOt | string;
  equipo?: string | null;

  equipoId?: string | null;
  categoriaEquipoId?: string | null;
  categoriaEquipoNombre?: string | null;
  fallaReportada?: string | null;

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

  equipo?: string | null;

  equipoId?: string | null;
  categoriaEquipoId?: string | null;
  categoriaEquipoNombre?: string | null;
  fallaReportada?: string | null;

  fallaDetectada?: string | null;
  diagnosticoTecnico?: string | null;
  trabajoARealizar?: string | null;

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
  asunto: string;
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
  asunto: string;
  descripcion: string;
  mensajes: TicketMensajeDto[];
  createdAt: string;
  updatedAt: string;
  ordenTrabajoId?: string | null;

  clienteId?: string | null;
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;

  equipo?: string | null;
  descripcionFalla?: string | null;
  tipoServicioSugerido?: 'TIENDA' | 'DOMICILIO' | string | null;
  direccion?: string | null;
  observaciones?: string | null;

  fotos?: TicketFotoDto[];

  fotoUrl?: string | null;
  direccionSolicitud?: string | null;
  tipoServicioSolicitado?: 'TIENDA' | 'DOMICILIO' | string | null;
}

export interface TicketBackofficeListaItem {
  id: string;
  estado: string;
  asunto: string;
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string | null;
  ordenTrabajoId?: string | null;
}

export interface CategoriaEquipoDto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
}

export interface CategoriaEquipoFallaDto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
}

export interface EquipoResumenDto {
  id: string;
  codigoEquipo: string;
  clienteId: string;
  clienteNombre: string;
  categoriaEquipoId?: string | null;
  categoriaEquipoNombre?: string | null;
  tipoEquipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  ubicacionHabitual?: string | null;
  estadoActivo: boolean;
}

export interface EquipoDetalleDto {
  id: string;
  codigoEquipo: string;
  clienteId: string;
  clienteNombre: string;
  categoria?: CategoriaEquipoDto | null;
  codigoInterno?: string | null;
  tipoEquipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  descripcionGeneral?: string | null;
  fechaCompra?: string | null;
  garantiaHasta?: string | null;
  ubicacionHabitual?: string | null;
  notasTecnicas?: string | null;
  estadoActivo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventarioCategoriaDto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
}

export interface InventarioItemResumenDto {
  id: string;
  sku: string;
  nombre: string;
  categoriaNombre?: string | null;
  marca?: string | null;
  unidadMedida: string;
  stockActual: string;
  stockMinimo: string;
  costoPromedio: string;
  precioVenta: string;
  activo: boolean;
}

export interface InventarioItemDetalleDto {
  id: string;
  sku: string;
  codigoBarras?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoria?: InventarioCategoriaDto | null;
  marca?: string | null;
  modeloCompatibilidad?: string | null;
  unidadMedida: string;
  stockActual: string;
  stockMinimo: string;
  stockMaximo?: string | null;
  controlaStock: boolean;
  permiteStockNegativo: boolean;
  costoPromedio: string;
  ultimoCosto: string;
  precioVenta: string;
  ubicacionAlmacen?: string | null;
  notas?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventarioMovimientoDto {
  id: string;
  tipoMovimiento: string;
  cantidad: string;
  stockAnterior: string;
  stockResultante: string;
  costoUnitario?: string | null;
  motivo?: string | null;
  observacion?: string | null;
  fechaMovimiento: string;
}

export interface WhatsappLinkResponse {
  url: string;
}