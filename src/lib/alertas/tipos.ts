import type { Rol, Severidad } from '@prisma/client'

/* =====================================================================
   El contrato del motor de alertas.

   Cada regla es una función independiente que recibe su configuración
   (umbral y severidad, tomados de ReglaAlerta) y devuelve los problemas
   que encontró. Nada más.

   La regla NO escribe en la base, no manda notificaciones y no sabe
   nada de las otras reglas. Eso lo hace el motor.
   ===================================================================== */

export interface ConfiguracionRegla {
  codigo: string
  severidad: Severidad
  /** Días, kilómetros, horas o porcentaje, según la regla. */
  umbral: number
  rolesDestino: Rol[]
}

/** Un problema concreto encontrado por una regla. */
export interface Hallazgo {
  /**
   * Identifica el problema de forma única y estable.
   * Regla de CLAUDE.md: código de regla + tipo y id de entidad. Es lo
   * que hace que la misma alerta no se duplique corrida tras corrida.
   */
  claveUnica: string
  titulo: string
  detalle: string
  entidadTipo: string
  entidadId: string
  /** Ruta interna que lleva directo al lugar donde se resuelve. */
  enlace: string
  obraId?: string | null
  /** Una regla puede subir la severidad de un caso puntual. */
  severidad?: Severidad
}

/** Una regla del motor. */
export interface Regla {
  codigo: string
  /** Módulos que afecta: se usa para reevaluar solo lo necesario. */
  modulo: string
  evaluar: (config: ConfiguracionRegla) => Promise<Hallazgo[]>
}

/** Arma la clave única de forma consistente en todas las reglas. */
export function clave(
  codigo: string,
  entidadTipo: string,
  entidadId: string,
  /** Para reglas que pueden abrir varias alertas por entidad. */
  discriminante?: string,
): string {
  return [codigo, entidadTipo, entidadId, discriminante]
    .filter(Boolean)
    .join(':')
}

/* ----------------------------- FECHAS ------------------------------- */

export function hoyCero(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function enDias(dias: number, desde: Date = hoyCero()): Date {
  const d = new Date(desde)
  d.setDate(d.getDate() + dias)
  return d
}

export function haceDias(dias: number, desde: Date = hoyCero()): Date {
  return enDias(-dias, desde)
}

export function haceHoras(horas: number): Date {
  return new Date(Date.now() - horas * 3_600_000)
}

/** Cuántos días pasaron desde una fecha, en días de calendario. */
export function diasDesde(fecha: Date, hasta: Date = hoyCero()): number {
  return Math.round((hasta.getTime() - fecha.getTime()) / 86_400_000)
}

export function diasHasta(fecha: Date, desde: Date = hoyCero()): number {
  return Math.round((fecha.getTime() - desde.getTime()) / 86_400_000)
}

export function esDiaHabil(fecha: Date): boolean {
  const d = fecha.getDay()
  return d !== 0 && d !== 6
}

/** El día hábil anterior a una fecha. */
export function diaHabilAnterior(desde: Date = hoyCero()): Date {
  const d = new Date(desde)
  do {
    d.setDate(d.getDate() - 1)
  } while (!esDiaHabil(d))
  return d
}

/** Los últimos N días hábiles, sin incluir hoy. */
export function ultimosDiasHabiles(cantidad: number): Date[] {
  const dias: Date[] = []
  const cursor = hoyCero()
  cursor.setDate(cursor.getDate() - 1)
  while (dias.length < cantidad) {
    if (esDiaHabil(cursor)) dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dias
}

/* ----------------------------- TEXTO -------------------------------- */

export function plural(n: number, singular: string, pluralForma?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForma ?? `${singular}s`)}`
}

export function fecha(f: Date | null | undefined): string {
  if (!f) return '—'
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`
}

export function plata(n: number): string {
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

export function textoEnum(valor: string): string {
  const t = valor.replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
