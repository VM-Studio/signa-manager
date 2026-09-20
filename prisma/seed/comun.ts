/* =====================================================================
   Herramientas compartidas por todos los módulos del seed.

   Dos decisiones que atraviesan todo:

   1. TODAS las fechas son relativas a hoy. La demo se le muestra al
      dueño en cualquier momento y tiene que verse siempre actual.
   2. El azar es determinista (semilla fija). Si el seed se vuelve a
      correr, sale exactamente lo mismo: la demo no cambia entre una
      prueba y la presentación.
   ===================================================================== */

import { Prisma } from '@prisma/client'

// ------------------------------ AZAR ---------------------------------

/** Generador determinista (mulberry32). Misma semilla, misma demo. */
function crearAzar(semilla: number) {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const azar = crearAzar(20260914)

/** Entero entre min y max, ambos incluidos. */
export function entero(min: number, max: number): number {
  return Math.floor(azar() * (max - min + 1)) + min
}

/** Decimal entre min y max con la cantidad de decimales pedida. */
export function decimal(min: number, max: number, decimales = 2): number {
  const n = azar() * (max - min) + min
  return Number(n.toFixed(decimales))
}

/** Un elemento cualquiera de la lista. */
export function uno<T>(lista: readonly T[]): T {
  return lista[Math.floor(azar() * lista.length)]
}

/** N elementos distintos de la lista. */
export function varios<T>(lista: readonly T[], cantidad: number): T[] {
  const copia = [...lista]
  const elegidos: T[] = []
  const n = Math.min(cantidad, copia.length)
  for (let i = 0; i < n; i++) {
    elegidos.push(copia.splice(Math.floor(azar() * copia.length), 1)[0])
  }
  return elegidos
}

/** true con la probabilidad dada (0 a 1). */
export function chance(probabilidad: number): boolean {
  return azar() < probabilidad
}

// ----------------------------- FECHAS --------------------------------

/** Hoy a las 00:00, que es la referencia de todo el seed. */
export function hoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function diasAtras(dias: number, desde: Date = hoy()): Date {
  const d = new Date(desde)
  d.setDate(d.getDate() - dias)
  return d
}

export function diasAdelante(dias: number, desde: Date = hoy()): Date {
  return diasAtras(-dias, desde)
}

export function mesesAtras(meses: number, desde: Date = hoy()): Date {
  const d = new Date(desde)
  d.setMonth(d.getMonth() - meses)
  return d
}

export function mesesAdelante(meses: number, desde: Date = hoy()): Date {
  return mesesAtras(-meses, desde)
}

/** Une una fecha con una hora del día: útil para viajes y partes. */
export function aHora(fecha: Date, hora: number, minutos = 0): Date {
  const d = new Date(fecha)
  d.setHours(hora, minutos, 0, 0)
  return d
}

/** Sábados y domingos no cuentan: en obra no se trabaja. */
export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay()
  return dia !== 0 && dia !== 6
}

/** Los últimos N días hábiles, del más viejo al más nuevo, sin incluir hoy. */
export function ultimosDiasHabiles(cantidad: number, hasta: Date = hoy()): Date[] {
  const dias: Date[] = []
  const cursor = new Date(hasta)
  cursor.setDate(cursor.getDate() - 1) // arranca ayer
  while (dias.length < cantidad) {
    if (esDiaHabil(cursor)) dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dias.reverse()
}

/** El día hábil anterior a la fecha dada. */
export function diaHabilAnterior(desde: Date = hoy()): Date {
  const d = new Date(desde)
  do {
    d.setDate(d.getDate() - 1)
  } while (!esDiaHabil(d))
  return d
}

/** Una fecha al azar entre dos, con la hora en cero. */
export function fechaEntre(desde: Date, hasta: Date): Date {
  const ms = desde.getTime() + azar() * (hasta.getTime() - desde.getTime())
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Fecha con hora al azar dentro de la jornada laboral. */
export function fechaHoraEntre(desde: Date, hasta: Date): Date {
  const d = fechaEntre(desde, hasta)
  d.setHours(entero(7, 17), uno([0, 15, 30, 45]), 0, 0)
  return d
}

// ------------------------- QUINCENAS ---------------------------------

export interface RangoQuincena {
  anio: number
  mes: number // 1 a 12
  numero: 1 | 2
  desde: Date
  hasta: Date
}

/** La quincena a la que pertenece una fecha. 1 = del 1 al 15, 2 = del 16 a fin de mes. */
export function quincenaDe(fecha: Date): RangoQuincena {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth()
  const numero: 1 | 2 = fecha.getDate() <= 15 ? 1 : 2
  const desde = new Date(anio, mes, numero === 1 ? 1 : 16)
  const hasta =
    numero === 1 ? new Date(anio, mes, 15) : new Date(anio, mes + 1, 0)
  desde.setHours(0, 0, 0, 0)
  hasta.setHours(0, 0, 0, 0)
  return { anio, mes: mes + 1, numero, desde, hasta }
}

/** La quincena anterior a la dada. */
export function quincenaAnterior(q: RangoQuincena): RangoQuincena {
  const referencia = new Date(q.desde)
  referencia.setDate(referencia.getDate() - 1)
  return quincenaDe(referencia)
}

// ------------------------- PLATA Y CÓDIGOS ---------------------------

/** Todo monto entra a la base como Decimal, nunca como float (CLAUDE.md). */
export function plata(valor: number): Prisma.Decimal {
  return new Prisma.Decimal(valor.toFixed(2))
}

/** Redondea a la unidad de mil más cercana: los precios reales no tienen centavos raros. */
export function redondearMiles(valor: number, a = 1000): number {
  return Math.round(valor / a) * a
}

/** SIG-H-0001, SIG-H-0002… */
export function codigoHerramienta(n: number): string {
  return `SIG-H-${String(n).padStart(4, '0')}`
}

/** Legajo de empleado: 0101, 0102… */
export function legajo(n: number): string {
  return String(n).padStart(4, '0')
}

/** DNI ficticio pero con formato válido (8 dígitos, rango creíble). */
export function dniFicticio(indice: number): string {
  return String(18_400_000 + indice * 7_919 + entero(0, 900))
}

/**
 * CUIL ficticio con dígito verificador correcto, porque las pantallas lo
 * van a validar y en la demo no puede saltar un error.
 */
export function cuilDesdeDni(dni: string, prefijo: '20' | '27' | '23'): string {
  const base = `${prefijo}${dni.padStart(8, '0')}`
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0)
  const resto = 11 - (suma % 11)
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto
  return `${base}${verificador}`
}

/** Patente argentina nueva: AB123CD. */
export function patenteNueva(indice: number): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const l = (n: number) => letras[n % 26]
  return `${l(indice * 3)}${l(indice * 7 + 4)}${String(100 + indice * 37).slice(0, 3)}${l(indice * 11 + 2)}${l(indice * 5 + 9)}`
}

/** Patente vieja: ABC123. Para los vehículos más antiguos de la flota. */
export function patenteVieja(indice: number): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const l = (n: number) => letras[n % 26]
  return `${l(indice * 5)}${l(indice * 9 + 1)}${l(indice * 13 + 6)}${String(200 + indice * 53).slice(0, 3)}`
}

// ------------------------- NOMBRES ARGENTINOS ------------------------

export const NOMBRES_VARON = [
  'Juan Carlos', 'Miguel Ángel', 'Roberto', 'Sergio', 'Gustavo', 'Marcelo',
  'Diego', 'Walter', 'Rubén', 'Héctor', 'Ramón', 'Luis Alberto', 'Claudio',
  'Fabián', 'Ariel', 'Maximiliano', 'Leandro', 'Cristian', 'Matías', 'Nahuel',
  'Braian', 'Emanuel', 'Facundo', 'Jonathan', 'Kevin', 'Alexis', 'Franco',
  'Lucas', 'Nicolás', 'Iván', 'Damián', 'Gonzalo', 'Pablo', 'Martín',
  'Fernando', 'Javier', 'Alejandro', 'Mauricio', 'Osvaldo', 'Néstor',
  'Julio César', 'Daniel', 'Eduardo', 'Ricardo', 'Omar', 'Antonio',
] as const

export const NOMBRES_MUJER = [
  'Silvana', 'Carolina', 'Malena', 'Verónica', 'Gabriela', 'Mariana',
  'Romina', 'Vanesa', 'Natalia', 'Soledad', 'Paula', 'Florencia',
] as const

export const APELLIDOS = [
  'Quiroga', 'Ledesma', 'Sarmiento', 'Ferreyra', 'Bustos', 'Gómez',
  'Fernández', 'Rodríguez', 'Sosa', 'Benítez', 'Ojeda', 'Villalba',
  'Acosta', 'Maidana', 'Cáceres', 'Ramírez', 'Aguirre', 'Medina',
  'Escobar', 'Vera', 'Godoy', 'Rojas', 'Arce', 'Coronel', 'Duarte',
  'Ibarra', 'Luna', 'Mansilla', 'Núñez', 'Olivera', 'Páez', 'Peralta',
  'Ríos', 'Suárez', 'Torres', 'Vallejos', 'Zárate', 'Bravo', 'Cardozo',
  'Delgado', 'Farías', 'Giménez', 'Herrera', 'Juárez', 'Lezcano',
  'Molina', 'Navarro', 'Ortiz', 'Pereyra', 'Ramos', 'Salinas', 'Tévez',
  'Vega', 'Barrios', 'Chávez', 'Domínguez', 'Encina', 'Figueroa',
  'Gauna', 'Insaurralde', 'Leiva', 'Miranda', 'Ocampo', 'Pintos',
  'Riquelme', 'Silva', 'Toledo', 'Valdez', 'Ayala', 'Britez', 'Cabrera',
] as const

export const LOCALIDADES_ZONA_NORTE = [
  'San Isidro', 'Vicente López', 'San Fernando', 'Tigre', 'Boulogne',
  'Martínez', 'Olivos', 'Florida', 'Munro', 'Villa Adelina', 'Beccar',
  'Don Torcuato', 'General Pacheco', 'Benavídez', 'Garín', 'Del Viso',
  'Pilar', 'Escobar', 'Ingeniero Maschwitz', 'Nordelta', 'Carapachay',
  'Boulogne Sur Mer', 'Las Lomas de San Isidro', 'Santos Lugares',
] as const

export const CALLES_ZONA_NORTE = [
  'Av. Maipú', 'Av. del Libertador', 'Paraná', 'Uruguay', 'Colectora Este',
  'Perú', 'Chile', 'Rivadavia', 'Alvear', 'Sarmiento', 'Belgrano',
  'Las Heras', 'Roque Sáenz Peña', 'Diego Palma', 'Ituzaingó', 'Ayacucho',
  'Guido', 'Juan B. Justo', 'Panamericana Ramal Tigre', 'Ruta 202',
  'Ruta 26', 'Av. Santa Fe', 'Corrientes', 'Tucumán', 'Entre Ríos',
] as const

export function direccionZonaNorte(): string {
  return `${uno(CALLES_ZONA_NORTE)} ${entero(100, 4800)}`
}

export function telefonoMovil(): string {
  return `11 ${entero(3000, 7999)}-${entero(1000, 9999)}`
}

/** Un nombre y apellido que no se repite dentro de la corrida. */
const usados = new Set<string>()

export function personaUnica(genero: 'V' | 'M' = 'V'): {
  nombre: string
  apellido: string
} {
  const lista = genero === 'V' ? NOMBRES_VARON : NOMBRES_MUJER
  for (let intento = 0; intento < 500; intento++) {
    const nombre = uno(lista)
    const apellido = uno(APELLIDOS)
    const clave = `${nombre}|${apellido}`
    if (!usados.has(clave)) {
      usados.add(clave)
      return { nombre, apellido }
    }
  }
  // Salida de emergencia: nunca debería llegar acá con estas listas.
  const nombre = uno(lista)
  const apellido = `${uno(APELLIDOS)} ${usados.size}`
  usados.add(`${nombre}|${apellido}`)
  return { nombre, apellido }
}

// ----------------------------- SALIDA --------------------------------

export function paso(texto: string): void {
  console.log(`  ${texto}`)
}

export function titulo(texto: string): void {
  console.log(`\n▸ ${texto}`)
}
