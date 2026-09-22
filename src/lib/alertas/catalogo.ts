/* =====================================================================
   Catálogo de reglas de alerta.

   Es la fuente única: de acá salen las filas de ReglaAlerta que carga el
   seed y contra acá se resuelve cada regla del motor. Los umbrales que
   están definidos acá son los valores por defecto; en producción se
   editan desde la pantalla de configuración y el motor usa siempre lo
   que dice la base.
   ===================================================================== */

import { CanalNotificacion, Rol, Severidad } from '@prisma/client'

export const MODULOS_ALERTA = [
  'herramientas',
  'personal',
  'vehiculos',
  'compras',
  'obras',
  'sistema',
] as const

export type ModuloAlerta = (typeof MODULOS_ALERTA)[number]

export interface DefinicionRegla {
  codigo: string
  nombre: string
  descripcion: string
  modulo: ModuloAlerta
  severidad: Severidad
  /** Días, kilómetros, horas o porcentaje, según la regla. */
  umbral: number | null
  /** Qué mide el umbral, para que la pantalla de configuración lo explique. */
  unidadUmbral: 'dias' | 'dias_habiles' | 'horas' | 'km' | 'porcentaje' | null
  rolesDestino: Rol[]
  canales: CanalNotificacion[]
}

const TODOS_LOS_MANDOS: Rol[] = [Rol.DUENO, Rol.ADMINISTRACION]

export const CATALOGO_REGLAS: DefinicionRegla[] = [
  // ----------------------------- HERRAMIENTAS -----------------------------
  {
    codigo: 'HERRAMIENTA_NO_DEVUELTA',
    nombre: 'Herramienta no devuelta',
    descripcion:
      'Pasó la fecha prevista de devolución y la herramienta sigue en obra. Se abre como aviso y pasa a crítica cuando la demora supera el umbral.',
    modulo: 'herramientas',
    severidad: Severidad.AVISO,
    umbral: 7,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.PANOLERO, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'HERRAMIENTA_EN_OBRA_INACTIVA',
    nombre: 'Herramienta en obra finalizada o pausada',
    descripcion:
      'La herramienta quedó en una obra que ya terminó o está pausada. Es plata parada que otra obra podría estar usando.',
    modulo: 'herramientas',
    severidad: Severidad.AVISO,
    umbral: 5,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.PANOLERO, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'MANTENIMIENTO_HERRAMIENTA_VENCIDO',
    nombre: 'Mantenimiento de herramienta vencido',
    descripcion:
      'Pasó la fecha del próximo mantenimiento preventivo. Usarla así acorta su vida útil y es un riesgo en obra.',
    modulo: 'herramientas',
    severidad: Severidad.AVISO,
    umbral: 0,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.PANOLERO, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'HERRAMIENTA_EN_REPARACION_DEMORADA',
    nombre: 'Herramienta demorada en reparación',
    descripcion:
      'La herramienta está en el taller hace más días que el umbral. Hay que reclamar al proveedor o darla de baja.',
    modulo: 'herramientas',
    severidad: Severidad.AVISO,
    umbral: 20,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.PANOLERO, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'SOLICITUD_HERRAMIENTA_SIN_RESOLVER',
    nombre: 'Solicitud de herramienta sin resolver',
    descripcion:
      'Falta poco para la fecha en que se necesita y la solicitud sigue pendiente. Si no se resuelve, la obra compra por su cuenta.',
    modulo: 'herramientas',
    severidad: Severidad.AVISO,
    umbral: 2,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.PANOLERO, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },

  // -------------------------------- PERSONAL ------------------------------
  {
    codigo: 'DOC_EMPLEADO_POR_VENCER',
    nombre: 'Documentación de empleado por vencer',
    descripcion:
      'Apto médico, ART, curso de seguridad o licencia a punto de vencer. Si ya venció, la alerta es crítica: el empleado no debería entrar a la obra.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 15,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.RRHH, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },
  {
    codigo: 'DOC_SUBCONTRATISTA_VENCIDA',
    nombre: 'Subcontratista con documentación vencida trabajando',
    descripcion:
      'El subcontratista tiene documentación vencida y registró presencia en obra en los últimos días. Es responsabilidad legal directa de la empresa.',
    modulo: 'personal',
    severidad: Severidad.CRITICA,
    umbral: 7,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.RRHH, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },
  {
    codigo: 'PARTE_DIARIO_FALTANTE',
    nombre: 'Parte diario faltante',
    descripcion:
      'Una obra en curso con gente asignada no tiene el parte de un día hábil anterior. Sin parte no hay horas, y sin horas no hay costo de mano de obra.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 1,
    unidadUmbral: 'dias_habiles',
    rolesDestino: [Rol.JEFE_OBRA, Rol.CAPATAZ, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'PARTE_SIN_APROBAR',
    nombre: 'Parte enviado sin aprobar',
    descripcion:
      'El capataz envió el parte y el jefe de obra todavía no lo aprobó. Hasta que no se apruebe, el costo no se congela ni entra en la quincena.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 3,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'HORAS_EXTRA_EXCESIVAS',
    nombre: 'Exceso de horas extra en la quincena',
    descripcion:
      'Un empleado acumuló más horas extra que el umbral en la quincena en curso. Encarece la obra y puede ser un problema de dotación.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 30,
    unidadUmbral: 'horas',
    rolesDestino: [Rol.RRHH, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'EMPLEADO_SIN_ASIGNACION',
    nombre: 'Empleado activo sin asignación',
    descripcion:
      'Un empleado activo lleva varios días hábiles sin estar asignado a ninguna obra. Se le paga y no está produciendo.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 5,
    unidadUmbral: 'dias_habiles',
    rolesDestino: [Rol.RRHH, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'AUSENCIAS_SIN_AVISO',
    nombre: 'Ausencias sin aviso reiteradas',
    descripcion:
      'El empleado acumula varias ausencias sin aviso en el mes. Es un dato que RRHH necesita antes de que se vuelva un problema.',
    modulo: 'personal',
    severidad: Severidad.AVISO,
    umbral: 3,
    unidadUmbral: null,
    rolesDestino: [Rol.RRHH, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'PRESUPUESTO_MANO_OBRA',
    nombre: 'Presupuesto de mano de obra comprometido',
    descripcion:
      'El costo de mano de obra de la obra superó el porcentaje de alerta de su presupuesto. Al pasar el 100% la alerta es crítica.',
    modulo: 'obras',
    severidad: Severidad.AVISO,
    umbral: 85,
    unidadUmbral: 'porcentaje',
    rolesDestino: [Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },

  // ------------------------------- VEHÍCULOS ------------------------------
  {
    codigo: 'DOC_VEHICULO_POR_VENCER',
    nombre: 'Documentación de vehículo por vencer',
    descripcion:
      'Seguro, VTV, patente o RUTA a punto de vencer. Si ya venció, la alerta es crítica y el vehículo no se puede asignar a un viaje.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 15,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.LOGISTICA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },
  {
    codigo: 'LICENCIA_CHOFER_POR_VENCER',
    nombre: 'Licencia de conducir por vencer',
    descripcion:
      'La licencia de un chofer vence pronto. Sin licencia al día no se le puede asignar ningún viaje.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 30,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.LOGISTICA, Rol.RRHH, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'SERVICE_VEHICULO_PROXIMO',
    nombre: 'Service de vehículo próximo',
    descripcion:
      'Al vehículo le faltan menos kilómetros que el umbral, o menos de 15 días, para el próximo service.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 1000,
    unidadUmbral: 'km',
    rolesDestino: [Rol.LOGISTICA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'SOLICITUD_VIAJE_SIN_ASIGNAR',
    nombre: 'Solicitud de viaje sin asignar',
    descripcion:
      'Falta menos que el umbral para la fecha pedida y todavía no hay vehículo ni chofer asignado.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 24,
    unidadUmbral: 'horas',
    rolesDestino: [Rol.LOGISTICA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'VIAJE_EN_CURSO_DEMORADO',
    nombre: 'Viaje en curso demorado',
    descripcion:
      'El viaje figura en curso hace más horas que el umbral. O el chofer se olvidó de cerrarlo, o pasó algo.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 12,
    unidadUmbral: 'horas',
    rolesDestino: [Rol.LOGISTICA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },
  {
    codigo: 'CONSUMO_COMBUSTIBLE_ALTO',
    nombre: 'Consumo de combustible por encima de lo normal',
    descripcion:
      'El consumo de las últimas cargas está por encima del propio promedio del vehículo. Puede ser una falla mecánica o una pérdida.',
    modulo: 'vehiculos',
    severidad: Severidad.AVISO,
    umbral: 25,
    unidadUmbral: 'porcentaje',
    rolesDestino: [Rol.LOGISTICA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },

  // -------------------------------- COMPRAS -------------------------------
  {
    codigo: 'PEDIDO_SIN_APROBAR',
    nombre: 'Pedido de compra sin aprobar',
    descripcion:
      'El pedido está esperando aprobación en el sistema base hace más días que el umbral. Esto es lo que frena una obra sin que nadie se entere.',
    modulo: 'compras',
    severidad: Severidad.AVISO,
    umbral: 3,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.ARQUITECTA, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },
  {
    codigo: 'MATERIAL_NO_ENTREGADO',
    nombre: 'Material que debía estar en obra y no llegó',
    descripcion:
      'Pasó la fecha en que el material tenía que estar en obra y todavía no se entregó. Es la alerta que evita que la cuadrilla se quede parada.',
    modulo: 'compras',
    severidad: Severidad.CRITICA,
    umbral: 0,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.ARQUITECTA, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP, CanalNotificacion.EMAIL],
  },
  {
    codigo: 'ENTREGA_POSTERIOR_A_NECESIDAD',
    nombre: 'Entrega estimada después de la fecha que se necesita',
    descripcion:
      'El proveedor entrega después de la fecha en que el material se necesita en obra. Todavía se está a tiempo de reclamar o buscar otro.',
    modulo: 'compras',
    severidad: Severidad.AVISO,
    umbral: 0,
    unidadUmbral: 'dias',
    rolesDestino: [Rol.ARQUITECTA, Rol.JEFE_OBRA, ...TODOS_LOS_MANDOS],
    canales: [CanalNotificacion.APP],
  },

  // -------------------------------- SISTEMA -------------------------------
  {
    codigo: 'SINCRONIZACION_ATRASADA',
    nombre: 'Sincronización con el sistema base atrasada',
    descripcion:
      'La última sincronización falló o no corre hace más horas que el umbral. Un tablero con datos viejos es peor que no tener tablero.',
    modulo: 'sistema',
    severidad: Severidad.CRITICA,
    umbral: 6,
    unidadUmbral: 'horas',
    rolesDestino: TODOS_LOS_MANDOS,
    canales: [CanalNotificacion.APP],
  },
]

/** Acceso rápido por código, que es como la usa el motor. */
export const REGLAS_POR_CODIGO = new Map(
  CATALOGO_REGLAS.map((r) => [r.codigo, r]),
)
