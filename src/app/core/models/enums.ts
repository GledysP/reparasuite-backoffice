export type RolUsuario = 'ADMIN' | 'TECNICO';

export type TipoOt = 'TIENDA' | 'DOMICILIO';

export type EstadoOt =
  | 'RECIBIDA'
  | 'PRESUPUESTO'
  | 'APROBADA'
  | 'EN_CURSO'
  | 'FINALIZADA'
  | 'CERRADA';

export type PrioridadOt = 'BAJA' | 'MEDIA' | 'ALTA';

export type TipoEventoOt =
  | 'CREADA'
  | 'CAMBIO_ESTADO'
  | 'CAMBIO_TECNICO'
  | 'NOTA_ANADIDA'
  | 'FOTO_ANADIDA'
  | 'CAMBIO_FECHA_PREVISTA';
