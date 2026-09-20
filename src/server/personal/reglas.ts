import { Asistencia, CategoriaLaboral, EstadoParte } from '@prisma/client'
import { numeroDeTexto } from '@/lib/formato'

/* =====================================================================
   Reglas del parte diario y de las quincenas.

   Aparte de las acciones para poder probarlas. Acá están las reglas que
   CLAUDE.md dice que el schema no puede expresar y hay que cumplir en
   código.
   ===================================================================== */

/** Horas que carga cada tipo de asistencia por defecto. */
export const HORAS_POR_ASISTENCIA: Record<Asistencia, number> = {
  PRESENTE: 8,
  MEDIA_JORNADA: 4,
  AUSENTE_CON_AVISO: 0,
  AUSENTE_SIN_AVISO: 0,
  LICENCIA: 0,
  VACACIONES: 0,
  FERIADO: 0,
  SUSPENSION_POR_LLUVIA: 0,
}

export const TEXTO_ASISTENCIA: Record<Asistencia, string> = {
  PRESENTE: 'Presente',
  MEDIA_JORNADA: 'Media jornada',
  AUSENTE_CON_AVISO: 'Ausente con aviso',
  AUSENTE_SIN_AVISO: 'Ausente sin aviso',
  LICENCIA: 'Licencia',
  VACACIONES: 'Vacaciones',
  FERIADO: 'Feriado',
  SUSPENSION_POR_LLUVIA: 'Suspensión por lluvia',
}

/** Las que cuentan como día trabajado. */
export function esDiaTrabajado(a: Asistencia): boolean {
  return a === Asistencia.PRESENTE || a === Asistencia.MEDIA_JORNADA
}

/** Las que cuentan como ausencia para el ausentismo. */
export function esAusencia(a: Asistencia): boolean {
  return (
    a === Asistencia.AUSENTE_CON_AVISO || a === Asistencia.AUSENTE_SIN_AVISO
  )
}

/* ---------------------------- COSTO --------------------------------- */

/**
 * Costo de una línea del parte.
 * Regla de CLAUDE.md: normales × vh + extra50 × vh × 1,5 + extra100 × vh × 2
 */
export function costoLinea(
  valorHora: number,
  horasNormales: number,
  horasExtra50: number,
  horasExtra100: number,
): number {
  return (
    valorHora * horasNormales +
    valorHora * horasExtra50 * 1.5 +
    valorHora * horasExtra100 * 2
  )
}

/* -------------------------- VALIDACIÓN ------------------------------ */

export interface LineaParte {
  empleadoId: string
  nombre: string
  asistencia: Asistencia
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  tarea?: string | null
}

export interface ProblemaParte {
  /** 'error' bloquea el envío; 'aviso' solo advierte. */
  nivel: 'error' | 'aviso'
  empleadoId?: string
  mensaje: string
}

const MAXIMO_HORAS_DIA = 16
const MAXIMO_HORAS_DOS_OBRAS = 12

/**
 * Revisa un parte entero.
 *
 * Los errores bloquean el envío. Los avisos se muestran pero dejan
 * seguir: el capataz está parado en la obra y la app no puede frenarlo
 * por algo que puede ser real.
 */
export function validarParte(
  lineas: LineaParte[],
  /** Dónde más figura presente cada empleado ese día, en otras obras. */
  presenciasEnOtrasObras: Map<string, { obra: string; horas: number }[]> = new Map(),
): ProblemaParte[] {
  const problemas: ProblemaParte[] = []

  if (lineas.length === 0) {
    problemas.push({
      nivel: 'error',
      mensaje: 'El parte no tiene a nadie. Agregá al menos una persona.',
    })
    return problemas
  }

  for (const l of lineas) {
    const total = l.horasNormales + l.horasExtra50 + l.horasExtra100

    if (l.horasNormales < 0 || l.horasExtra50 < 0 || l.horasExtra100 < 0) {
      problemas.push({
        nivel: 'error',
        empleadoId: l.empleadoId,
        mensaje: `${l.nombre}: las horas no pueden ser negativas.`,
      })
      continue
    }

    if (total > MAXIMO_HORAS_DIA) {
      problemas.push({
        nivel: 'error',
        empleadoId: l.empleadoId,
        mensaje: `${l.nombre}: ${total} horas en un día es imposible. Revisalo.`,
      })
    }

    // Si está ausente no puede tener horas cargadas.
    if (!esDiaTrabajado(l.asistencia) && total > 0) {
      problemas.push({
        nivel: 'error',
        empleadoId: l.empleadoId,
        mensaje: `${l.nombre} figura como ${TEXTO_ASISTENCIA[l.asistencia].toLowerCase()} pero tiene ${total} horas cargadas.`,
      })
    }

    // Si está presente tiene que tener horas.
    if (l.asistencia === Asistencia.PRESENTE && total === 0) {
      problemas.push({
        nivel: 'aviso',
        empleadoId: l.empleadoId,
        mensaje: `${l.nombre} figura presente pero sin horas.`,
      })
    }

    if (l.asistencia === Asistencia.MEDIA_JORNADA && l.horasNormales > 4) {
      problemas.push({
        nivel: 'aviso',
        empleadoId: l.empleadoId,
        mensaje: `${l.nombre}: media jornada con ${l.horasNormales} horas normales.`,
      })
    }

    // Regla de CLAUDE.md: un empleado no puede figurar PRESENTE en dos
    // obras el mismo día con más de 12 horas sumadas. Si está en dos
    // obras con horas parciales, se avisa pero no se bloquea.
    const enOtras = presenciasEnOtrasObras.get(l.empleadoId)
    if (enOtras && enOtras.length > 0 && esDiaTrabajado(l.asistencia)) {
      const horasDeOtras = enOtras.reduce((a, o) => a + o.horas, 0)
      const sumadas = total + horasDeOtras
      const obras = enOtras.map((o) => o.obra).join(', ')

      if (sumadas > MAXIMO_HORAS_DOS_OBRAS) {
        problemas.push({
          nivel: 'error',
          empleadoId: l.empleadoId,
          mensaje: `${l.nombre} ya tiene ${horasDeOtras} horas en ${obras} ese día. Con estas ${total} suman ${sumadas}, y el máximo entre obras es ${MAXIMO_HORAS_DOS_OBRAS}.`,
        })
      } else {
        problemas.push({
          nivel: 'aviso',
          empleadoId: l.empleadoId,
          mensaje: `${l.nombre} también figura en ${obras} ese día (${horasDeOtras} h).`,
        })
      }
    }
  }

  return problemas
}

export function hayErrores(problemas: ProblemaParte[]): boolean {
  return problemas.some((p) => p.nivel === 'error')
}

/* ------------------------ ESTADO DEL PARTE -------------------------- */

/** Solo se edita en BORRADOR (regla de CLAUDE.md). */
export function sePuedeEditar(estado: EstadoParte): boolean {
  return estado === EstadoParte.BORRADOR
}

/** El jefe de obra puede corregir un parte enviado antes de aprobarlo. */
export function sePuedeCorregir(estado: EstadoParte): boolean {
  return estado === EstadoParte.BORRADOR || estado === EstadoParte.ENVIADO
}

export function sePuedeAprobar(estado: EstadoParte): boolean {
  return estado === EstadoParte.ENVIADO
}

export const TEXTO_PARTE: Record<EstadoParte, string> = {
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  APROBADO: 'Aprobado',
}

/* --------------------------- QUINCENAS ------------------------------ */

export interface RangoQuincena {
  anio: number
  mes: number
  numero: 1 | 2
  desde: Date
  hasta: Date
}

/** La quincena de una fecha: 1 = del 1 al 15, 2 = del 16 a fin de mes. */
export function quincenaDe(fecha: Date): RangoQuincena {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth()
  const numero: 1 | 2 = fecha.getDate() <= 15 ? 1 : 2

  const desde = new Date(anio, mes, numero === 1 ? 1 : 16)
  const hasta = numero === 1 ? new Date(anio, mes, 15) : new Date(anio, mes + 1, 0)
  desde.setHours(0, 0, 0, 0)
  hasta.setHours(0, 0, 0, 0)

  return { anio, mes: mes + 1, numero, desde, hasta }
}

export function nombreQuincena(q: {
  anio: number
  mes: number
  numero: number
}): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  const mitad = q.numero === 1 ? '1ª quincena' : '2ª quincena'
  return `${mitad} de ${meses[q.mes - 1]} ${q.anio}`
}

/** Un día hábil: en obra no se trabaja sábado ni domingo. */
export function esDiaHabil(fecha: Date): boolean {
  const d = fecha.getDay()
  return d !== 0 && d !== 6
}

/** Los días hábiles de un rango, incluidos los extremos. */
export function diasHabilesEntre(desde: Date, hasta: Date): Date[] {
  const dias: Date[] = []
  const cursor = new Date(desde)
  cursor.setHours(0, 0, 0, 0)
  const fin = new Date(hasta)
  fin.setHours(0, 0, 0, 0)

  while (cursor <= fin) {
    if (esDiaHabil(cursor)) dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

/* ----------------------- CIERRE DE QUINCENA ------------------------- */

export interface PendienteDeCierre {
  tipo: 'parte_sin_aprobar' | 'dia_sin_parte'
  obra: string
  fecha: Date
  detalle: string
}

/**
 * Qué falta para poder cerrar una quincena.
 * No bloquea: avisa. Cerrar con algo pendiente es decisión de
 * administración, pero tiene que saber qué se está dejando afuera.
 */
export function pendientesDeCierre(
  diasHabiles: Date[],
  partes: Array<{ obraId: string; obra: string; fecha: Date; estado: EstadoParte }>,
  obrasConGente: Array<{ id: string; codigo: string }>,
): PendienteDeCierre[] {
  const pendientes: PendienteDeCierre[] = []

  for (const p of partes) {
    if (p.estado !== EstadoParte.APROBADO) {
      pendientes.push({
        tipo: 'parte_sin_aprobar',
        obra: p.obra,
        fecha: p.fecha,
        detalle: `El parte del ${p.fecha.toLocaleDateString('es-AR')} está en ${TEXTO_PARTE[p.estado].toLowerCase()}.`,
      })
    }
  }

  const clave = (obraId: string, fecha: Date) =>
    `${obraId}|${fecha.toISOString().slice(0, 10)}`
  const cargados = new Set(partes.map((p) => clave(p.obraId, p.fecha)))

  for (const obra of obrasConGente) {
    for (const dia of diasHabiles) {
      if (!cargados.has(clave(obra.id, dia))) {
        pendientes.push({
          tipo: 'dia_sin_parte',
          obra: obra.codigo,
          fecha: dia,
          detalle: `No hay parte del ${dia.toLocaleDateString('es-AR')}.`,
        })
      }
    }
  }

  return pendientes.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}

/* =====================================================================
   Reglas del alta de personal.

   Están acá, fuera del archivo de acciones, porque son funciones puras
   y así se pueden probar sin base de datos.
   ===================================================================== */

/**
 * ¿El CUIL o CUIT es válido?
 *
 * No alcanza con contar once números: el último es un dígito verificador
 * y cargar uno inventado hace que después rebote la ART o el estudio
 * contable, cuando ya es tarde.
 */
export function cuilValido(cuil: string): boolean {
  const limpio = cuil.replace(/\D/g, '')
  if (limpio.length !== 11) return false

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = limpio
    .slice(0, 10)
    .split('')
    .reduce((a, d, i) => a + Number(d) * pesos[i], 0)

  const resto = 11 - (suma % 11)
  const esperado = resto === 11 ? 0 : resto === 10 ? 9 : resto
  return esperado === Number(limpio[10])
}

export { numeroDeTexto }

export function normalizarTexto(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Los nombres de categoría como los escribe la gente, no como los guarda el enum. */
const CATEGORIA_POR_TEXTO = new Map<string, CategoriaLaboral>([
  ['oficial especializado', CategoriaLaboral.OFICIAL_ESPECIALIZADO],
  ['of especializado', CategoriaLaboral.OFICIAL_ESPECIALIZADO],
  ['oficial', CategoriaLaboral.OFICIAL],
  ['medio oficial', CategoriaLaboral.MEDIO_OFICIAL],
  ['medio of', CategoriaLaboral.MEDIO_OFICIAL],
  ['ayudante', CategoriaLaboral.AYUDANTE],
  ['peon', CategoriaLaboral.AYUDANTE],
  ['sereno', CategoriaLaboral.SERENO],
  ['capataz', CategoriaLaboral.CAPATAZ],
  ['chofer', CategoriaLaboral.CHOFER],
  ['administrativo', CategoriaLaboral.ADMINISTRATIVO],
  ['otro', CategoriaLaboral.OTRO],
])

export function categoriaDeTexto(texto: string): CategoriaLaboral | null {
  const limpio = normalizarTexto(texto)
  if (!limpio) return null

  const directa = CATEGORIA_POR_TEXTO.get(limpio)
  if (directa) return directa

  // También se acepta el nombre del enum tal cual, por si el archivo
  // sale de una exportación del propio sistema.
  const comoEnum = limpio.replace(/\s+/g, '_').toUpperCase()
  return (Object.values(CategoriaLaboral) as string[]).includes(comoEnum)
    ? (comoEnum as CategoriaLaboral)
    : null
}

/** Acepta 2026-09-14, 14/09/2026 y 14-09-26. */
export function fechaDeTexto(t: string | undefined): Date | null {
  const limpio = (t ?? '').trim()
  if (!limpio) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }

  const criollo = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(limpio)
  if (criollo) {
    const anio = Number(criollo[3])
    const d = new Date(
      anio < 100 ? 2000 + anio : anio,
      Number(criollo[2]) - 1,
      Number(criollo[1]),
    )
    return Number.isNaN(d.getTime()) ? null : d
  }

  return null
}

/**
 * ¿Se puede sumar a esta gente a la cuadrilla?
 *
 * Regla de CLAUDE.md: un empleado está en una sola cuadrilla activa. Se
 * revisa antes de guardar y se devuelve quién está dónde, para poder
 * decirlo con nombre y apellido en vez de un "no se puede" seco.
 */
export interface ConflictoCuadrilla {
  empleado: string
  cuadrilla: string
}

export function conflictosDeCuadrilla(
  candidatos: Array<{
    empleadoId: string
    nombre: string
    cuadrillaActiva: string | null
  }>,
  elegidos: string[],
): ConflictoCuadrilla[] {
  const marcados = new Set(elegidos)

  return candidatos
    .filter((c) => marcados.has(c.empleadoId) && c.cuadrillaActiva !== null)
    .map((c) => ({
      empleado: c.nombre,
      cuadrilla: c.cuadrillaActiva as string,
    }))
}
