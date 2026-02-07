export interface RespuestaPaginada<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface ErrorApi {
  codigo: 'VALIDACION' | 'NO_AUTENTICADO' | 'NO_AUTORIZADO' | 'NO_ENCONTRADO' | 'CONFLICTO' | 'ERROR_INTERNO' | string;
  mensaje: string;
  campos?: { campo: string; error: string }[];
}
