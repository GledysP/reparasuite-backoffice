// Usamos 'import type' para traerlos y que se puedan usar aquí abajo
import type { EstadoOt, PrioridadOt, RolUsuario, TipoEventoOt, TipoOt } from './enums';

// Usamos 'export type' para que otros archivos (como el servicio) puedan verlos
export type { EstadoOt, PrioridadOt, RolUsuario, TipoEventoOt, TipoOt };
export interface UsuarioResumen {
  id: string;
  nombre: string;
  rol: RolUsuario;
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
  estado: EstadoOt;
  tipo: TipoOt;
  prioridad: PrioridadOt;
  cliente: { id: string; nombre: string; telefono: string | null };
  tecnico: { id: string; nombre: string } | null;
  fechaPrevista: string | null;
  actualizadoEn: string;
}

export interface NotaOt {
  id: string;
  autor: { id: string; nombre: string };
  contenido: string;
  creadoEn: string;
}

export interface FotoOt {
  id: string;
  nombreArchivo: string;
  url: string;
  creadoEn: string;
}

export interface EventoOt {
  id: string;
  tipo: TipoEventoOt;
  actor: { id: string; nombre: string } | null;
  datos: Record<string, unknown>;
  creadoEn: string;
}

export interface OtDetalle {
  id: string;
  codigo: string;
  estado: EstadoOt;
  tipo: TipoOt;
  prioridad: PrioridadOt;

  cliente: { id: string; nombre: string; telefono: string | null; email: string | null };
  tecnico: { id: string; nombre: string } | null;

  descripcion: string;

  fechaPrevista: string | null;
  direccion: string | null;
  notasAcceso: string | null;

  notas: NotaOt[];
  fotos: FotoOt[];
  eventos: EventoOt[];

  creadoEn: string;
  actualizadoEn: string;
}

export interface AjustesTaller {
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  prefijoOt: string;
}
