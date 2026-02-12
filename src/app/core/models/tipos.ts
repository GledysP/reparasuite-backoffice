// Importo los enums para definir las reglas de negocio de los estados y tipos
import type { EstadoOt, PrioridadOt, RolUsuario, TipoEventoOt, TipoOt } from './enums';

// Exporto los tipos para que los servicios y componentes hablen el mismo idioma
export type { EstadoOt, PrioridadOt, RolUsuario, TipoEventoOt, TipoOt };

/**
 * Represento la información mínima de un usuario para mostrar en listas o asignaciones.
 */
export interface UsuarioResumen {
  id: string;
  nombre: string;
  rol: RolUsuario;
  activo?: boolean;
}

/**
 * Gestiono los datos de contacto básicos de un cliente vinculados a una orden.
 */
export interface ClienteResumen {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

/**
 * Estructuro cada fila de la tabla principal de Órdenes de Trabajo para que sea ligera y rápida.
 */
export interface OtListaItem {
  id: string;
  codigo: string;
  estado: EstadoOt;
  tipo: TipoOt;
  prioridad: PrioridadOt;
  clienteNombre: string;     
  tecnicoNombre: string | null; 
  updatedAt: string;         
}

/**
 * Defino el formato de los comentarios internos que los técnicos dejan en la orden.
 */
export interface NotaOt {
  id: string;
  autor: { id: string; nombre: string };
  contenido: string;
  creadoEn: string;
}

/**
 * Registro la ubicación y metadatos de las imágenes subidas como evidencia del trabajo.
 */
export interface FotoOt {
  id: string;
  nombreArchivo: string;
  url: string;
  creadoEn: string;
}

/**
 * Documento eventos técnicos del sistema para auditoría interna.
 */
export interface EventoOt {
  id: string;
  tipo: TipoEventoOt;
  actor: { id: string; nombre: string } | null;
  datos: Record<string, unknown>;
  creadoEn: string;
}

/**
 * Soy la fuente de verdad detallada de una Orden de Trabajo, uniendo cliente, técnicos y multimedia.
 */
export interface OtDetalle {
  id: string;
  codigo: string;
  estado: EstadoOt;
  tipo: TipoOt;
  prioridad: PrioridadOt;

  cliente: { 
    id: string; 
    nombre: string; 
    telefono: string | null; 
    email: string | null 
  };
  tecnico: { id: string; nombre: string } | null;

  descripcion: string;

  fechaPrevista: string | null;
  direccion: string | null;
  notasAcceso: string | null;

  notas: NotaOt[];
  fotos: FotoOt[];
  eventos: EventoOt[];
  
  // Añado este campo para recibir la implementación automatizada del backend
  historial: HistorialItem[]; 

  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Almaceno la configuración global de identidad y formato del taller.
 */
export interface AjustesTaller {
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  prefijoOt: string;
}

/**
 * Represento las órdenes asociadas a un cliente específico dentro de su perfil.
 */
export interface ClienteOrdenItem {
  id: string;
  codigo: string;
  estado: EstadoOt;
  tipo: TipoOt;
  updatedAt: string; 
  tecnicoNombre: string | null;
}

// --- AGREGADO PARA EL NUEVO TIMELINE DEL BACKEND ---

/**
 * Defino la estructura de los eventos del historial que el backend generará automáticamente.
 * Estos objetos alimentan el Timeline visual en el detalle de la orden.
 */
export interface HistorialItem {
  fecha: string;
  evento: string; // Ej: 'ESTADO_CAMBIADO', 'NOTA_AGREGADA', 'FOTO_SUBIDA'
  descripcion: string; // Texto enriquecido: "Orden creada (TIENDA/ALTA) para Carlos Pérez..."
  usuario: {
    nombre: string; // Nombre del usuario que disparó la acción obtenido del JWT
  };
}