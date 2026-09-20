export { NOMBRE_COOKIE, firmarSesion, verificarToken } from './token'
export type { Sesion } from './token'

export {
  iniciarSesion,
  cerrarSesion,
  obtenerSesion,
  exigirSesion,
} from './sesion'
export type { ResultadoIngreso } from './sesion'

export {
  MODULOS,
  ACCIONES,
  puede,
  puedeAlguno,
  exigirPermiso,
  permisosDe,
  veTodasLasObras,
  NOMBRE_ROL,
} from './permisos'
export type { Modulo, Accion, Permiso } from './permisos'

export {
  obrasDeLaSesion,
  filtroObras,
  filtroPorObraId,
  exigirAccesoAObra,
} from './obras'
