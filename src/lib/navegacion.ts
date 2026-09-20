import type { Permiso } from '@/lib/auth/permisos'

/* =====================================================================
   El mapa de la app: qué hay en la barra inferior, qué hay en "Más" y
   qué permiso hace falta para ver cada cosa.

   Está acá y no dentro de los componentes para que la barra, la pantalla
   de "Más" y el título del header salgan todos de la misma lista.
   ===================================================================== */

export interface ItemNavegacion {
  href: string
  texto: string
  /** Ícono de lucide-react, por nombre. Lo resuelve el componente. */
  icono: string
  /** Si falta, lo ve cualquiera con sesión. */
  permiso?: Permiso
  descripcion?: string
}

/** Los cinco accesos de la barra inferior. */
export const BARRA_INFERIOR: ItemNavegacion[] = [
  { href: '/inicio', texto: 'Inicio', icono: 'Home' },
  { href: '/herramientas', texto: 'Herramientas', icono: 'Hammer', permiso: 'herramientas.ver' },
  { href: '/personal', texto: 'Personal', icono: 'HardHat', permiso: 'personal.ver' },
  { href: '/vehiculos', texto: 'Vehículos', icono: 'Truck', permiso: 'vehiculos.ver' },
  { href: '/mas', texto: 'Más', icono: 'Menu' },
]

/** Todo lo que no entró en la barra, agrupado para la pantalla de "Más". */
export const SECCIONES_MAS: Array<{
  titulo: string
  items: ItemNavegacion[]
}> = [
  {
    titulo: 'Trabajo',
    items: [
      { href: '/obras', texto: 'Obras', icono: 'Building2', permiso: 'obras.ver', descripcion: 'Fichas, personal, herramientas y compras de cada obra' },
      { href: '/alertas', texto: 'Alertas', icono: 'Bell', permiso: 'alertas.ver', descripcion: 'Todo lo que está frenado, vencido o fuera de lugar' },
      { href: '/tablero', texto: 'Tablero', icono: 'BarChart3', permiso: 'tablero.ver', descripcion: 'Costo real y resultado por obra y por unidad de negocio' },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { href: '/mas/depositos', texto: 'Depósitos', icono: 'Warehouse', permiso: 'configuracion.ver', descripcion: 'Dónde se guardan las herramientas' },
      { href: '/mas/unidades', texto: 'Unidades de negocio', icono: 'Layers', permiso: 'configuracion.configurar', descripcion: 'Las cinco áreas de la empresa' },
      { href: '/mas/usuarios', texto: 'Usuarios', icono: 'Users', permiso: 'configuracion.ver', descripcion: 'Quién entra a la app y con qué rol' },
      { href: '/mas/reglas-alerta', texto: 'Reglas de alerta', icono: 'SlidersHorizontal', permiso: 'configuracion.configurar', descripcion: 'Qué avisa el sistema y con cuánta anticipación' },
      { href: '/mas/sincronizacion', texto: 'Sincronización', icono: 'RefreshCw', permiso: 'configuracion.ver', descripcion: 'Conexión con el sistema base de la empresa' },
    ],
  },
  {
    titulo: 'Mi cuenta',
    items: [
      { href: '/mas/mi-cuenta', texto: 'Mi cuenta', icono: 'User', descripcion: 'Tus datos y tu contraseña' },
    ],
  },
]

/* ---------------------------------------------------------------------
   Títulos de sección para el header. La ruta más larga que coincida es
   la que manda, así /herramientas/solicitudes no muestra "Herramientas".
   --------------------------------------------------------------------- */

const TITULOS: Array<[string, string]> = [
  ['/inicio', 'Inicio'],
  ['/herramientas/solicitudes', 'Solicitudes'],
  ['/herramientas/mantenimiento', 'Mantenimiento'],
  ['/herramientas/importar', 'Carga masiva'],
  ['/herramientas/nueva', 'Nueva herramienta'],
  ['/herramientas/escanear', 'Escanear'],
  ['/herramientas/etiquetas', 'Etiquetas'],
  ['/herramientas/ubicaciones', 'Ubicaciones'],
  ['/herramientas', 'Herramientas'],
  ['/personal/empleados', 'Empleados'],
  ['/personal/subcontratistas', 'Subcontratistas'],
  ['/personal/cuadrillas', 'Cuadrillas'],
  ['/personal/planificacion', 'Planificación'],
  ['/personal/partes/nuevo', 'Parte diario'],
  ['/personal/partes', 'Partes diarios'],
  ['/personal/quincenas', 'Quincenas'],
  ['/personal', 'Personal'],
  ['/vehiculos/solicitudes', 'Solicitudes de viaje'],
  ['/vehiculos/agenda', 'Agenda'],
  ['/vehiculos/ahora', 'En este momento'],
  ['/vehiculos/mis-viajes', 'Mis viajes'],
  ['/vehiculos/vencimientos', 'Vencimientos'],
  ['/vehiculos/viajes', 'Viaje'],
  ['/vehiculos', 'Vehículos'],
  ['/obras', 'Obras'],
  ['/alertas', 'Alertas'],
  ['/tablero', 'Tablero'],
  ['/mas/depositos', 'Depósitos'],
  ['/mas/unidades', 'Unidades de negocio'],
  ['/mas/usuarios', 'Usuarios'],
  ['/mas/reglas-alerta', 'Reglas de alerta'],
  ['/mas/sincronizacion', 'Sincronización'],
  ['/mas/mi-cuenta', 'Mi cuenta'],
  ['/mas', 'Más'],
]

export function tituloDeRuta(ruta: string): string {
  const encontrado = TITULOS.find(
    ([prefijo]) => ruta === prefijo || ruta.startsWith(`${prefijo}/`),
  )
  return encontrado?.[1] ?? 'Signa'
}
