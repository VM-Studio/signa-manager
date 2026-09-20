'use client'

/* =====================================================================
   Borradores y cola de envío del parte diario.

   En las obras muchas veces no hay señal. Esto resuelve solo eso:

   · mientras se completa, el borrador se guarda en el teléfono
   · si al enviar no hay conexión, queda en cola
   · cuando vuelve la señal, se envía solo

   Únicamente para el parte diario. El resto de la app necesita datos
   frescos del servidor, y mostrar un listado de herramientas viejo sería
   peor que no mostrar nada.
   ===================================================================== */

const CLAVE_BORRADORES = 'signa_borradores_parte'
const CLAVE_COLA = 'signa_cola_partes'

export interface ParteGuardado {
  obraId: string
  fecha: string
  clima: string
  tareasDelDia: string | null
  observaciones: string | null
  lineas: Array<{
    empleadoId: string
    asistencia: string
    horasNormales: number
    horasExtra50: number
    horasExtra100: number
    tarea: string | null
  }>
  subcontratistas: Array<{
    subcontratistaId: string
    cantidadPersonas: number
    tarea: string | null
  }>
  /** Cuándo se guardó, para poder avisar si quedó viejo. */
  guardadoEn: number
}

export interface EnCola extends ParteGuardado {
  id: string
  intentos: number
  ultimoError: string | null
}

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    // Navegación privada, almacenamiento lleno o JSON corrupto.
    return porDefecto
  }
}

function escribir(clave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

/** La clave de un parte: una obra y un día. */
function claveDe(obraId: string, fecha: string): string {
  return `${obraId}|${fecha}`
}

/* --------------------------- BORRADORES ----------------------------- */

export function guardarBorrador(parte: ParteGuardado): boolean {
  const todos = leer<Record<string, ParteGuardado>>(CLAVE_BORRADORES, {})
  todos[claveDe(parte.obraId, parte.fecha)] = { ...parte, guardadoEn: Date.now() }
  return escribir(CLAVE_BORRADORES, todos)
}

export function leerBorrador(
  obraId: string,
  fecha: string,
): ParteGuardado | null {
  const todos = leer<Record<string, ParteGuardado>>(CLAVE_BORRADORES, {})
  return todos[claveDe(obraId, fecha)] ?? null
}

export function borrarBorrador(obraId: string, fecha: string): void {
  const todos = leer<Record<string, ParteGuardado>>(CLAVE_BORRADORES, {})
  delete todos[claveDe(obraId, fecha)]
  escribir(CLAVE_BORRADORES, todos)
}

/* ------------------------------ COLA -------------------------------- */

export function ponerEnCola(parte: ParteGuardado): EnCola {
  const cola = leer<EnCola[]>(CLAVE_COLA, [])
  const id = claveDe(parte.obraId, parte.fecha)

  const nuevo: EnCola = {
    ...parte,
    id,
    intentos: 0,
    ultimoError: null,
    guardadoEn: Date.now(),
  }

  // Si ya había uno de la misma obra y día, se reemplaza: vale el último.
  const sinRepetir = cola.filter((p) => p.id !== id)
  escribir(CLAVE_COLA, [...sinRepetir, nuevo])

  return nuevo
}

export function leerCola(): EnCola[] {
  return leer<EnCola[]>(CLAVE_COLA, [])
}

export function sacarDeLaCola(id: string): void {
  escribir(
    CLAVE_COLA,
    leerCola().filter((p) => p.id !== id),
  )
}

export function marcarIntentoFallido(id: string, error: string): void {
  escribir(
    CLAVE_COLA,
    leerCola().map((p) =>
      p.id === id ? { ...p, intentos: p.intentos + 1, ultimoError: error } : p,
    ),
  )
}

export function hayPendientes(): boolean {
  return leerCola().length > 0
}

/** Si el navegador cree que hay conexión. No garantiza que el servidor conteste. */
export function hayConexion(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
