import type { ItemNavegacion } from '@/lib/navegacion'

/* =====================================================================
   El mapa de la barra lateral de escritorio.

   Vive acá, en la capa de presentación, y no en src/lib/navegacion.ts,
   porque es una decisión de cómo se muestra la app y no de qué hay en
   ella. Los permisos y las rutas son los mismos que usa la barra
   inferior del celular: nadie ve de más por entrar desde la compu.
   ===================================================================== */

export interface GrupoLateral {
  /** Rótulo del grupo. Vacío en el primero: no hace falta nombrarlo. */
  titulo?: string
  items: ItemNavegacion[]
}

export const NAVEGACION_LATERAL: GrupoLateral[] = [
  {
    items: [
      { href: '/inicio', texto: 'Inicio', icono: 'Home' },
      { href: '/tablero', texto: 'Tablero', icono: 'BarChart3', permiso: 'tablero.ver' },
      { href: '/obras', texto: 'Obras', icono: 'Building2', permiso: 'obras.ver' },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { href: '/herramientas', texto: 'Herramientas', icono: 'Hammer', permiso: 'herramientas.ver' },
      { href: '/personal', texto: 'Personal', icono: 'HardHat', permiso: 'personal.ver' },
      { href: '/vehiculos', texto: 'Vehículos', icono: 'Truck', permiso: 'vehiculos.ver' },
    ],
  },
  {
    titulo: 'Control',
    items: [
      { href: '/alertas', texto: 'Alertas', icono: 'Bell', permiso: 'alertas.ver' },
    ],
  },
]

/** Va al pie, separado del resto. */
export const ITEM_CONFIGURACION: ItemNavegacion = {
  href: '/mas',
  texto: 'Configuración',
  icono: 'Settings',
}

/* ---------------------------------------------------------------------
   Pestañas de cada módulo.

   En el celular estas pantallas se alcanzan desde la home del módulo.
   En escritorio, con la barra lateral ocupando el lugar de la barra
   inferior, pasan a ser pestañas debajo de la barra superior.
   --------------------------------------------------------------------- */

export interface PestanaModulo {
  href: string
  texto: string
  permiso?: ItemNavegacion['permiso']
  /** Con true, solo marca activa la coincidencia exacta. */
  exacta?: boolean
}

export const PESTANAS_MODULO: Array<{
  prefijo: string
  pestanas: PestanaModulo[]
}> = [
  {
    prefijo: '/herramientas',
    pestanas: [
      { href: '/herramientas', texto: 'Inventario', exacta: true },
      { href: '/herramientas/ubicaciones', texto: 'Por ubicación' },
      { href: '/herramientas/solicitudes', texto: 'Solicitudes' },
      { href: '/herramientas/mantenimiento', texto: 'Mantenimiento' },
      { href: '/herramientas/etiquetas', texto: 'Etiquetas' },
    ],
  },
  {
    prefijo: '/personal',
    pestanas: [
      { href: '/personal', texto: 'Resumen', exacta: true },
      { href: '/personal/empleados', texto: 'Empleados' },
      { href: '/personal/partes', texto: 'Partes diarios' },
      { href: '/personal/planificacion', texto: 'Planificación' },
      { href: '/personal/quincenas', texto: 'Quincenas' },
      { href: '/personal/cuadrillas', texto: 'Cuadrillas' },
      { href: '/personal/subcontratistas', texto: 'Subcontratistas' },
    ],
  },
  {
    prefijo: '/vehiculos',
    pestanas: [
      { href: '/vehiculos', texto: 'Flota', exacta: true },
      { href: '/vehiculos/ahora', texto: 'En este momento' },
      { href: '/vehiculos/agenda', texto: 'Agenda' },
      { href: '/vehiculos/solicitudes', texto: 'Solicitudes' },
      { href: '/vehiculos/vencimientos', texto: 'Vencimientos' },
      { href: '/vehiculos/mis-viajes', texto: 'Mis viajes' },
    ],
  },
  {
    prefijo: '/mas',
    pestanas: [
      { href: '/mas', texto: 'Todo', exacta: true },
      { href: '/mas/usuarios', texto: 'Usuarios', permiso: 'configuracion.ver' },
      { href: '/mas/depositos', texto: 'Depósitos', permiso: 'configuracion.ver' },
      { href: '/mas/unidades', texto: 'Unidades', permiso: 'configuracion.configurar' },
      { href: '/mas/reglas-alerta', texto: 'Reglas de alerta', permiso: 'configuracion.configurar' },
      { href: '/mas/sincronizacion', texto: 'Sincronización', permiso: 'configuracion.ver' },
      { href: '/mas/mi-cuenta', texto: 'Mi cuenta' },
    ],
  },
]

/** Las pestañas del módulo al que pertenece una ruta, si tiene. */
export function pestanasDeRuta(ruta: string): PestanaModulo[] | null {
  const modulo = PESTANAS_MODULO.find(
    (m) => ruta === m.prefijo || ruta.startsWith(`${m.prefijo}/`),
  )
  return modulo?.pestanas ?? null
}
