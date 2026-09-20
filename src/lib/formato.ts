import {
  format,
  formatDistanceToNowStrict,
  differenceInCalendarDays,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'

/* =====================================================================
   Formato es-AR. Un solo lugar para toda la app: si cambia acá, cambia
   en todas las pantallas.
   ===================================================================== */

/** Lo que puede llegar como fecha: Date, string ISO o null. */
export type FechaEntrada = Date | string | null | undefined

/**
 * Lo que puede llegar como monto. Los Decimal de Prisma llegan como objeto
 * con toString(), no como number: nunca hacer Number(decimal) sin pasar por acá.
 */
export type MontoEntrada =
  | number
  | string
  | { toString(): string }
  | null
  | undefined

// ------------------------------- FECHAS -------------------------------

export function aFecha(valor: FechaEntrada): Date | null {
  if (valor === null || valor === undefined) return null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  const parseada = parseISO(valor)
  return Number.isNaN(parseada.getTime()) ? null : parseada
}

// ------------------------------- NÚMEROS ------------------------------

export function aNumero(valor: MontoEntrada): number {
  if (valor === null || valor === undefined) return 0
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  const n = Number(valor.toString())
  return Number.isFinite(n) ? n : 0
}

const numeroEntero = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
})

const numeroDecimal = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1250000 → "1.250.000" */
export function numero(valor: MontoEntrada, decimales = 0): string {
  const n = aNumero(valor)
  return decimales > 0
    ? new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }).format(n)
    : numeroEntero.format(n)
}

// ------------------------------- MONEDA -------------------------------

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const pesosConCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dolares = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Monto en pesos. Sin centavos por defecto: en obra nadie lee los centavos
 * de un presupuesto de doce millones.
 *   1250000 → "$ 1.250.000"
 */
export function moneda(valor: MontoEntrada, conCentavos = false): string {
  const n = aNumero(valor)
  const texto = conCentavos ? pesosConCentavos.format(n) : pesos.format(n)
  // Intl escribe "$1.250.000"; el espacio se lee mejor en una lista.
  return texto.replace(/^(\D+)/, '$1 ').replace(/\s+/g, ' ').trim()
}

/** 4500 → "US$ 4.500" */
export function monedaUsd(valor: MontoEntrada): string {
  return dolares.format(aNumero(valor)).replace(/^(\D+)/, '$1 ').replace(/\s+/g, ' ').trim()
}

/** Elige el formateador según la moneda del registro. */
export function montoEnMoneda(valor: MontoEntrada, monedaCodigo: 'ARS' | 'USD' | string): string {
  return monedaCodigo === 'USD' ? monedaUsd(valor) : moneda(valor)
}

/**
 * Montos grandes acortados para las cifras del tablero.
 *   12500000 → "$ 12,5 M"
 */
export function monedaCorta(valor: MontoEntrada): string {
  const n = aNumero(valor)
  const abs = Math.abs(n)
  const signo = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${signo}$ ${numero(abs / 1_000_000_000, 1)} MM`
  if (abs >= 1_000_000) return `${signo}$ ${numero(abs / 1_000_000, 1)} M`
  if (abs >= 1_000) return `${signo}$ ${numero(abs / 1_000, 0)} mil`
  return moneda(n)
}

/** 0.847 → "84,7%" · el valor entra como fracción, no como porcentaje. */
export function porcentaje(fraccion: MontoEntrada, decimales = 1): string {
  return `${numeroDecimalOEntero(aNumero(fraccion) * 100, decimales)}%`
}

/** 84.7 → "84,7%" · el valor ya viene en porcentaje. */
export function porcentajeDirecto(valor: MontoEntrada, decimales = 1): string {
  return `${numeroDecimalOEntero(aNumero(valor), decimales)}%`
}

function numeroDecimalOEntero(n: number, decimales: number): string {
  if (decimales === 0) return numeroEntero.format(n)
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  }).format(n)
}

// ------------------------------- FECHAS -------------------------------

/** 2026-09-20 → "20/09/26" */
export function fechaCorta(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'dd/MM/yy', { locale: es }) : '—'
}

/** 2026-09-20 → "20/09/2026" */
export function fechaNumerica(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'dd/MM/yyyy', { locale: es }) : '—'
}

/** 2026-09-20 → "20 de septiembre de 2026" */
export function fechaLarga(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'
}

/** 2026-09-20 → "sábado 20 de septiembre" */
export function fechaConDia(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, "EEEE d 'de' MMMM", { locale: es }) : '—'
}

/** 2026-09-20 → "20 sep" · para listas apretadas */
export function fechaBreve(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'd MMM', { locale: es }).replace('.', '') : '—'
}

/** 2026-09-20T14:30 → "14:30" */
export function hora(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'HH:mm', { locale: es }) : '—'
}

/** 2026-09-20T14:30 → "20/09 14:30" */
export function fechaYHora(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'dd/MM HH:mm', { locale: es }) : '—'
}

/** "septiembre 2026" */
export function mesYAnio(valor: FechaEntrada): string {
  const f = aFecha(valor)
  return f ? format(f, 'MMMM yyyy', { locale: es }) : '—'
}

/**
 * Fecha en lenguaje de todos los días, que es como la lee un capataz.
 * Hoy / Ayer / Mañana, y si no, la fecha.
 */
export function fechaRelativaCorta(valor: FechaEntrada): string {
  const f = aFecha(valor)
  if (!f) return '—'
  if (isToday(f)) return 'Hoy'
  if (isYesterday(f)) return 'Ayer'
  if (isTomorrow(f)) return 'Mañana'
  return fechaCorta(f)
}

/** "hace 3 días", "hace 2 meses" */
export function haceCuanto(valor: FechaEntrada): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return `hace ${formatDistanceToNowStrict(f, { locale: es })}`
}

/**
 * Cuánto falta o cuánto pasó, en días enteros de calendario.
 * Es lo que mira todo el módulo de vencimientos y el de devoluciones.
 *   +5 → faltan 5 días · -3 → venció hace 3 días
 */
export function diasHasta(valor: FechaEntrada, desde: Date = new Date()): number | null {
  const f = aFecha(valor)
  if (!f) return null
  return differenceInCalendarDays(f, desde)
}

/** "vence en 5 días" / "venció hace 3 días" / "vence hoy" */
export function textoVencimiento(valor: FechaEntrada, desde: Date = new Date()): string {
  const dias = diasHasta(valor, desde)
  if (dias === null) return 'Sin vencimiento'
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  if (dias === -1) return 'Venció ayer'
  if (dias > 0) return `Vence en ${dias} días`
  return `Venció hace ${Math.abs(dias)} días`
}

// ------------------------------- TEXTO --------------------------------

/** "juan carlos pérez" → "Juan Carlos Pérez" */
export function capitalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es-AR')
    .replace(/(^|\s|-)([\p{L}])/gu, (_, sep: string, letra: string) => sep + letra.toLocaleUpperCase('es-AR'))
}

/** Nombre completo de un empleado, siempre en el mismo orden. */
export function nombreCompleto(persona: { nombre: string; apellido: string }): string {
  return `${persona.apellido}, ${persona.nombre}`
}

/** "Pérez, Juan" → "Juan Pérez" para títulos y saludos. */
export function nombreNatural(persona: { nombre: string; apellido: string }): string {
  return `${persona.nombre} ${persona.apellido}`
}

/** Iniciales para los avatares de las listas. */
export function iniciales(persona: { nombre: string; apellido: string }): string {
  return `${persona.nombre.charAt(0)}${persona.apellido.charAt(0)}`.toLocaleUpperCase('es-AR')
}

/** Convierte un enum del schema en texto legible: MEDIA_JORNADA → "Media jornada" */
export function textoEnum(valor: string | null | undefined): string {
  if (!valor) return '—'
  const t = valor.replace(/_/g, ' ').toLocaleLowerCase('es-AR')
  return t.charAt(0).toLocaleUpperCase('es-AR') + t.slice(1)
}

/** "1" → "1 herramienta" · "3" → "3 herramientas" */
export function plural(cantidad: number, singular: string, pluralForma?: string): string {
  const forma = cantidad === 1 ? singular : (pluralForma ?? `${singular}s`)
  return `${numero(cantidad)} ${forma}`
}

/** Corta un texto largo sin cortar una palabra al medio. */
export function recortar(texto: string, largo = 60): string {
  if (texto.length <= largo) return texto
  return `${texto.slice(0, texto.lastIndexOf(' ', largo))}…`
}

// ------------------------------- HORAS --------------------------------

/** 8.5 → "8,5 h" */
export function horas(valor: MontoEntrada): string {
  const n = aNumero(valor)
  return `${numeroDecimalOEntero(n, 1)} h`
}

/** Patente argentina, con el formato que se usa en la calle: AB 123 CD / ABC 123 */
export function patente(valor: string): string {
  const limpia = valor.replace(/[\s-]/g, '').toUpperCase()
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(limpia)) {
    return `${limpia.slice(0, 2)} ${limpia.slice(2, 5)} ${limpia.slice(5)}`
  }
  if (/^[A-Z]{3}\d{3}$/.test(limpia)) {
    return `${limpia.slice(0, 3)} ${limpia.slice(3)}`
  }
  return limpia
}

/** 12345678 → "12.345.678" */
export function dni(valor: string | null | undefined): string {
  if (!valor) return '—'
  return numeroEntero.format(Number(valor.replace(/\D/g, ''))) || valor
}

/** 20123456783 → "20-12345678-3" */
export function cuil(valor: string | null | undefined): string {
  if (!valor) return '—'
  const limpio = valor.replace(/\D/g, '')
  if (limpio.length !== 11) return valor
  return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`
}

/** 125000 → "125.000 km" */
export function kilometros(valor: MontoEntrada): string {
  return `${numeroEntero.format(aNumero(valor))} km`
}

/** 3500 → "3.500 kg" · 15000 → "15 t" */
export function peso(valor: MontoEntrada): string {
  const n = aNumero(valor)
  if (n >= 1000) return `${numeroDecimalOEntero(n / 1000, 1)} t`
  return `${numeroEntero.format(n)} kg`
}

/** 9.8 → "9,8 L/100 km" */
export function consumo(valor: MontoEntrada): string {
  return `${numeroDecimal.format(aNumero(valor))} L/100 km`
}

/** 45.5 → "45,5 L" */
export function litros(valor: MontoEntrada): string {
  return `${numeroDecimalOEntero(aNumero(valor), 1)} L`
}
