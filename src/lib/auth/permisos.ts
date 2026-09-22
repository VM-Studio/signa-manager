import { Rol } from '@prisma/client'
import type { Sesion } from './token'

/* =====================================================================
   Permisos.

   Un solo lugar para toda la app (regla de CLAUDE.md). Cada permiso es
   "modulo.accion". Los botones se ocultan según esto, pero lo que de
   verdad protege es que cada Server Action y cada query del servidor
   llamen a exigirPermiso antes de tocar nada.
   ===================================================================== */

export const MODULOS = [
  'obras',
  'herramientas',
  'personal',
  'vehiculos',
  'alertas',
  'tablero',
  'compras',
  'configuracion',
] as const

export type Modulo = (typeof MODULOS)[number]

export const ACCIONES = ['ver', 'crear', 'editar', 'aprobar', 'configurar'] as const
export type Accion = (typeof ACCIONES)[number]

export type Permiso = `${Modulo}.${Accion}`

/** Todas las acciones de un módulo, para no escribirlas una por una. */
function todo(modulo: Modulo): Permiso[] {
  return ACCIONES.map((a) => `${modulo}.${a}` as Permiso)
}

function algunas(modulo: Modulo, acciones: Accion[]): Permiso[] {
  return acciones.map((a) => `${modulo}.${a}` as Permiso)
}

/* ---------------------------------------------------------------------
   La matriz de la tabla de roles de CLAUDE.md, expresada como permisos
   concretos por módulo y acción.
   --------------------------------------------------------------------- */

const MATRIZ: Record<Rol, Permiso[]> = {
  // Todo, más tablero y configuración.
  [Rol.DUENO]: [
    ...todo('obras'),
    ...todo('herramientas'),
    ...todo('personal'),
    ...todo('vehiculos'),
    ...todo('alertas'),
    ...todo('tablero'),
    ...todo('compras'),
    ...todo('configuracion'),
  ],

  // Todo salvo la configuración sensible: ve el tablero y maneja personal,
  // quincenas, pagos, documentos y usuarios, pero no cambia las reglas
  // del sistema ni las unidades de negocio.
  [Rol.ADMINISTRACION]: [
    ...todo('obras'),
    ...todo('herramientas'),
    ...todo('personal'),
    ...todo('vehiculos'),
    ...todo('alertas'),
    ...algunas('tablero', ['ver']),
    ...algunas('compras', ['ver']),
    ...algunas('configuracion', ['ver', 'crear', 'editar']),
  ],

  // Sus obras. Pide herramientas y viajes, y ve los costos de sus obras.
  [Rol.ARQUITECTA]: [
    ...algunas('obras', ['ver', 'editar']),
    ...algunas('herramientas', ['ver', 'crear']),
    ...algunas('personal', ['ver']),
    ...algunas('vehiculos', ['ver', 'crear']),
    ...algunas('alertas', ['ver', 'editar']),
    ...algunas('compras', ['ver']),
  ],

  // Sus obras. Aprueba partes, pide herramientas y viajes, asigna personal.
  [Rol.JEFE_OBRA]: [
    ...algunas('obras', ['ver', 'editar']),
    ...algunas('herramientas', ['ver', 'crear']),
    ...algunas('personal', ['ver', 'crear', 'editar', 'aprobar']),
    ...algunas('vehiculos', ['ver', 'crear']),
    ...algunas('alertas', ['ver', 'editar']),
    ...algunas('compras', ['ver']),
  ],

  // Su obra. Carga el parte diario, recibe y devuelve herramientas.
  [Rol.CAPATAZ]: [
    ...algunas('obras', ['ver']),
    ...algunas('herramientas', ['ver', 'crear']),
    ...algunas('personal', ['ver', 'crear', 'editar']),
    ...algunas('vehiculos', ['ver', 'crear']),
    ...algunas('alertas', ['ver']),
  ],

  // Herramientas y depósitos: altas, entregas, devoluciones, mantenimiento
  // y resolución de solicitudes.
  [Rol.PANOLERO]: [
    ...algunas('obras', ['ver']),
    ...algunas('herramientas', ['ver', 'crear', 'editar', 'aprobar']),
    ...algunas('personal', ['ver']),
    ...algunas('alertas', ['ver', 'editar']),
  ],

  // Vehículos: asigna viajes, carga combustible, mantenimiento y documentos.
  [Rol.LOGISTICA]: [
    ...algunas('obras', ['ver']),
    ...algunas('herramientas', ['ver']),
    ...algunas('personal', ['ver']),
    ...algunas('vehiculos', ['ver', 'crear', 'editar', 'aprobar']),
    ...algunas('alertas', ['ver', 'editar']),
  ],

  // Sus viajes y su vehículo. Inicia y finaliza viajes, carga combustible.
  [Rol.CHOFER]: [
    ...algunas('vehiculos', ['ver', 'editar']),
    ...algunas('alertas', ['ver']),
  ],

  // Personal: fichas, documentos, EPP y novedades.
  [Rol.RRHH]: [
    ...algunas('obras', ['ver']),
    ...algunas('personal', ['ver', 'crear', 'editar']),
    ...algunas('herramientas', ['ver']),
    ...algunas('vehiculos', ['ver']),
    ...algunas('alertas', ['ver', 'editar']),
  ],
}

/** Los permisos de un rol, ya listos para consultar. */
const PERMISOS_POR_ROL = Object.entries(MATRIZ).reduce(
  (acumulado, [rol, permisos]) => {
    acumulado[rol as Rol] = new Set(permisos)
    return acumulado
  },
  {} as Record<Rol, ReadonlySet<Permiso>>,
)

/* --------------------------- API pública --------------------------- */

export function puede(
  sesion: Pick<Sesion, 'rol' | 'accesos'> | null | undefined,
  permiso: Permiso,
): boolean {
  if (!sesion) return false

  const modulo = permiso.slice(0, permiso.indexOf('.')) as Modulo
  const excepcion = sesion.accesos?.[modulo]

  /*
   * Módulo cerrado a mano: no ve nada de ese módulo, aunque el rol se lo
   * dé. Corta antes que cualquier otra cosa.
   */
  if (excepcion === false) return false

  /*
   * Módulo abierto a mano: se le da VER, aunque el rol no lo tenga. Lo
   * que puede hacer adentro lo sigue decidiendo el rol, que es lo que
   * evita que abrir un módulo convierta a un capataz en administrador.
   */
  if (excepcion === true && permiso === `${modulo}.ver`) return true

  return PERMISOS_POR_ROL[sesion.rol].has(permiso)
}

/** ¿Tiene alguno de estos permisos? Útil para mostrar una sección entera. */
export function puedeAlguno(
  sesion: Pick<Sesion, 'rol'> | null | undefined,
  permisos: Permiso[],
): boolean {
  return permisos.some((p) => puede(sesion, p))
}

/** Lanza si no puede. Va en cada Server Action y en cada query. */
export function exigirPermiso(
  sesion: Pick<Sesion, 'rol'> | null | undefined,
  permiso: Permiso,
): void {
  if (!puede(sesion, permiso)) {
    throw new Error('No tenés permiso para hacer esto.')
  }
}

/** Todos los permisos de un rol, para la pantalla de usuarios. */
export function permisosDe(rol: Rol): Permiso[] {
  return [...PERMISOS_POR_ROL[rol]]
}

/** ¿El rol, por sí solo y sin excepciones, ve este módulo? */
export function rolVeModulo(rol: Rol, modulo: Modulo): boolean {
  return PERMISOS_POR_ROL[rol].has(`${modulo}.ver`)
}

/**
 * Qué módulos ve una persona hoy, ya con las excepciones aplicadas.
 * Lo usa la pantalla de Accesos para dibujar las casillas.
 */
export function modulosQueVe(
  rol: Rol,
  accesos: Record<string, boolean> = {},
): Record<Modulo, boolean> {
  return Object.fromEntries(
    MODULOS.map((m) => [m, accesos[m] ?? rolVeModulo(rol, m)]),
  ) as Record<Modulo, boolean>
}

/**
 * El módulo de permisos al que corresponde una regla de alerta.
 *
 * Las reglas usan los mismos nombres salvo 'sistema', que agrupa lo que
 * no es de ningún módulo operativo —la sincronización atrasada, por
 * ejemplo— y es cosa de quien maneja la configuración.
 */
export function moduloDeLaAlerta(moduloDeRegla: string): Modulo {
  return moduloDeRegla === 'sistema'
    ? 'configuracion'
    : (moduloDeRegla as Modulo)
}

/**
 * Los módulos de regla cuyas alertas puede recibir esta sesión.
 *
 * Es la lista que filtra la bandeja, el contador de la campana y a quién
 * se le crea la notificación: si a alguien se le cerró Vehículos, no
 * tiene por qué enterarse de que venció una VTV.
 */
export function modulosDeAlertaQueRecibe(
  sesion: Pick<Sesion, 'rol' | 'accesos'>,
  modulosDeRegla: readonly string[],
): string[] {
  return modulosDeRegla.filter((m) =>
    puede(sesion, `${moduloDeLaAlerta(m)}.ver`),
  )
}

/** Los módulos, con nombre para mostrar. */
export const NOMBRE_MODULO: Record<Modulo, string> = {
  obras: 'Obras',
  herramientas: 'Herramientas',
  personal: 'Personal',
  vehiculos: 'Vehículos',
  alertas: 'Alertas',
  tablero: 'Tablero',
  compras: 'Compras',
  configuracion: 'Configuración',
}

/* ---------------------------------------------------------------------
   Alcance por obra.

   Los jefes de obra, la arquitecta y los capataces no ven todas las
   obras: ven las suyas. Esta función devuelve los ids de las obras que
   le corresponden a la sesión, o null cuando ve todo.
   --------------------------------------------------------------------- */

/** Roles que ven la empresa entera. */
const VEN_TODAS_LAS_OBRAS: Rol[] = [
  Rol.DUENO,
  Rol.ADMINISTRACION,
  Rol.PANOLERO,
  Rol.LOGISTICA,
  Rol.RRHH,
]

export function veTodasLasObras(sesion: Pick<Sesion, 'rol'>): boolean {
  return VEN_TODAS_LAS_OBRAS.includes(sesion.rol)
}

export const NOMBRE_ROL: Record<Rol, string> = {
  [Rol.DUENO]: 'Dueño',
  [Rol.ADMINISTRACION]: 'Administración',
  [Rol.ARQUITECTA]: 'Arquitecta',
  [Rol.JEFE_OBRA]: 'Jefe de obra',
  [Rol.CAPATAZ]: 'Capataz',
  [Rol.PANOLERO]: 'Pañolero',
  [Rol.LOGISTICA]: 'Logística',
  [Rol.CHOFER]: 'Chofer',
  [Rol.RRHH]: 'Recursos humanos',
}
