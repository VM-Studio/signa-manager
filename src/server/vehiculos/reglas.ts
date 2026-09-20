import { EstadoVehiculo, EstadoViaje, TipoDocumentoVehiculo } from '@prisma/client'

/* =====================================================================
   Reglas de los viajes.

   Todas las validaciones de CLAUDE.md son BLOQUEANTES y tienen que
   explicar el motivo: quien asigna un viaje necesita saber por qué no
   puede mandar ese camión, no que el botón no haga nada.
   ===================================================================== */

/** Documentos sin los cuales un vehículo no puede salir a la calle. */
export const DOCUMENTOS_BLOQUEANTES: TipoDocumentoVehiculo[] = [
  TipoDocumentoVehiculo.SEGURO,
  TipoDocumentoVehiculo.VTV,
]

export interface VehiculoParaAsignar {
  id: string
  patente: string
  tipo: string
  marca: string
  modelo: string
  estado: EstadoVehiculo
  capacidadCargaKg: number | null
  cantidadPasajeros: number | null
  costoKmEstimado: number | null
  /** Documentos vencidos que bloquean, con su fecha. */
  documentosVencidos: Array<{ tipo: TipoDocumentoVehiculo; vencimiento: Date | null }>
  /** Viajes que ya tiene en el horario pedido. */
  viajesSuperpuestos: Array<{ id: string; destino: string; salida: Date }>
}

export interface ChoferParaAsignar {
  id: string
  nombre: string
  apellido: string
  licenciaVence: Date | null
  viajesSuperpuestos: Array<{ id: string; destino: string; salida: Date }>
}

export interface PedidoDeViaje {
  pesoCargaKg: number | null
  cantidadPersonas: number | null
  salidaPrevista: Date
}

export type MotivoBloqueo =
  | 'estado'
  | 'seguro'
  | 'vtv'
  | 'capacidad'
  | 'pasajeros'
  | 'superpuesto'

export interface Bloqueo {
  motivo: MotivoBloqueo
  mensaje: string
}

/* ------------------------ VEHÍCULO DISPONIBLE ----------------------- */

/**
 * Por qué NO se puede usar este vehículo. Lista vacía = se puede.
 * Cada motivo se explica como se lo explicaría a una persona.
 */
export function bloqueosDelVehiculo(
  v: VehiculoParaAsignar,
  pedido: PedidoDeViaje,
): Bloqueo[] {
  const bloqueos: Bloqueo[] = []

  if (v.estado === EstadoVehiculo.EN_TALLER) {
    bloqueos.push({
      motivo: 'estado',
      mensaje: `${v.patente} está en el taller.`,
    })
  }
  if (v.estado === EstadoVehiculo.FUERA_DE_SERVICIO) {
    bloqueos.push({
      motivo: 'estado',
      mensaje: `${v.patente} está fuera de servicio.`,
    })
  }
  if (v.estado === EstadoVehiculo.VENDIDO) {
    bloqueos.push({
      motivo: 'estado',
      mensaje: `${v.patente} ya no es de la empresa.`,
    })
  }

  // Seguro o VTV vencidos: bloqueante, sin excepción.
  for (const doc of v.documentosVencidos) {
    if (doc.tipo === TipoDocumentoVehiculo.SEGURO) {
      bloqueos.push({
        motivo: 'seguro',
        mensaje: `${v.patente} tiene el seguro vencido${doc.vencimiento ? ` desde el ${formatearFecha(doc.vencimiento)}` : ''}. No puede salir a la calle.`,
      })
    }
    if (doc.tipo === TipoDocumentoVehiculo.VTV) {
      bloqueos.push({
        motivo: 'vtv',
        mensaje: `${v.patente} tiene la VTV vencida${doc.vencimiento ? ` desde el ${formatearFecha(doc.vencimiento)}` : ''}. No puede salir a la calle.`,
      })
    }
  }

  // El peso de la carga no puede superar la capacidad del vehículo.
  if (pedido.pesoCargaKg !== null && pedido.pesoCargaKg > 0) {
    if (v.capacidadCargaKg === null) {
      bloqueos.push({
        motivo: 'capacidad',
        mensaje: `${v.patente} no tiene capacidad de carga cargada en el sistema.`,
      })
    } else if (pedido.pesoCargaKg > v.capacidadCargaKg) {
      bloqueos.push({
        motivo: 'capacidad',
        mensaje: `${v.patente} lleva hasta ${formatearPeso(v.capacidadCargaKg)} y la carga es de ${formatearPeso(pedido.pesoCargaKg)}.`,
      })
    }
  }

  if (pedido.cantidadPersonas !== null && pedido.cantidadPersonas > 0) {
    if (v.cantidadPasajeros === null) {
      bloqueos.push({
        motivo: 'pasajeros',
        mensaje: `${v.patente} no tiene cantidad de pasajeros cargada.`,
      })
    } else if (pedido.cantidadPersonas > v.cantidadPasajeros) {
      bloqueos.push({
        motivo: 'pasajeros',
        mensaje: `${v.patente} lleva ${v.cantidadPasajeros} personas y hay que trasladar ${pedido.cantidadPersonas}.`,
      })
    }
  }

  if (v.viajesSuperpuestos.length > 0) {
    const otro = v.viajesSuperpuestos[0]
    bloqueos.push({
      motivo: 'superpuesto',
      mensaje: `${v.patente} ya tiene un viaje a ${otro.destino} a las ${formatearHora(otro.salida)}.`,
    })
  }

  return bloqueos
}

export function bloqueosDelChofer(c: ChoferParaAsignar): Bloqueo[] {
  const bloqueos: Bloqueo[] = []
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Licencia vencida: bloqueante.
  if (c.licenciaVence !== null && c.licenciaVence < hoy) {
    bloqueos.push({
      motivo: 'estado',
      mensaje: `${c.nombre} ${c.apellido} tiene la licencia vencida desde el ${formatearFecha(c.licenciaVence)}.`,
    })
  }

  if (c.viajesSuperpuestos.length > 0) {
    const otro = c.viajesSuperpuestos[0]
    bloqueos.push({
      motivo: 'superpuesto',
      mensaje: `${c.nombre} ${c.apellido} ya tiene un viaje a ${otro.destino} a las ${formatearHora(otro.salida)}.`,
    })
  }

  return bloqueos
}

/* --------------------- ORDEN DE LAS PROPUESTAS ---------------------- */

export interface VehiculoPropuesto {
  vehiculo: VehiculoParaAsignar
  bloqueos: Bloqueo[]
  /** Cuánto le sobra de capacidad. Menos sobra = mejor elección. */
  sobraKg: number | null
  sirve: boolean
}

/**
 * Los vehículos que sirven, del más chico que alcanza al más grande.
 *
 * El problema real: mandar un camión de 15.000 kg a llevar 300 kg
 * cuesta plata y deja el camión grande ocupado.
 */
export function proponerVehiculos(
  vehiculos: VehiculoParaAsignar[],
  pedido: PedidoDeViaje,
): VehiculoPropuesto[] {
  const propuestas = vehiculos.map((v) => {
    const bloqueos = bloqueosDelVehiculo(v, pedido)
    const sobraKg =
      pedido.pesoCargaKg !== null && v.capacidadCargaKg !== null
        ? v.capacidadCargaKg - pedido.pesoCargaKg
        : null

    return { vehiculo: v, bloqueos, sobraKg, sirve: bloqueos.length === 0 }
  })

  return propuestas.sort((a, b) => {
    // Primero los que sirven.
    if (a.sirve !== b.sirve) return a.sirve ? -1 : 1

    // Entre los que sirven, el que menos capacidad desperdicia.
    if (a.sirve && b.sirve) {
      if (a.sobraKg !== null && b.sobraKg !== null) {
        return a.sobraKg - b.sobraKg
      }
      // Sin peso pedido: primero el más chico.
      const capA = a.vehiculo.capacidadCargaKg ?? Number.MAX_SAFE_INTEGER
      const capB = b.vehiculo.capacidadCargaKg ?? Number.MAX_SAFE_INTEGER
      return capA - capB
    }

    // Entre los bloqueados, el que tiene menos problemas primero.
    return a.bloqueos.length - b.bloqueos.length
  })
}

/* ------------------------ INICIO Y FIN DE VIAJE --------------------- */

export type ValidacionViaje = { ok: true } | { ok: false; error: string }

export function validarInicio(
  estado: EstadoViaje,
  kmSalida: number,
  kmActualDelVehiculo: number,
): ValidacionViaje {
  if (estado !== EstadoViaje.PROGRAMADO) {
    return {
      ok: false,
      error:
        estado === EstadoViaje.EN_CURSO
          ? 'Este viaje ya está en curso.'
          : 'Este viaje ya terminó.',
    }
  }

  if (!Number.isFinite(kmSalida) || kmSalida < 0) {
    return { ok: false, error: 'Poné los kilómetros que marca el tablero.' }
  }

  // Un margen de 50 km por si alguien movió el vehículo sin cargar el viaje.
  if (kmSalida < kmActualDelVehiculo - 50) {
    return {
      ok: false,
      error: `El vehículo marcaba ${formatearNumero(kmActualDelVehiculo)} km la última vez. ¿Seguro que son ${formatearNumero(kmSalida)}?`,
    }
  }

  return { ok: true }
}

export function validarFin(
  estado: EstadoViaje,
  kmSalida: number | null,
  kmLlegada: number,
): ValidacionViaje {
  if (estado !== EstadoViaje.EN_CURSO) {
    return {
      ok: false,
      error:
        estado === EstadoViaje.PROGRAMADO
          ? 'Este viaje todavía no arrancó.'
          : 'Este viaje ya está cerrado.',
    }
  }

  if (!Number.isFinite(kmLlegada) || kmLlegada < 0) {
    return { ok: false, error: 'Poné los kilómetros que marca el tablero.' }
  }

  // Regla de CLAUDE.md: kmLlegada >= kmSalida.
  if (kmSalida !== null && kmLlegada < kmSalida) {
    return {
      ok: false,
      error: `Saliste con ${formatearNumero(kmSalida)} km y estás poniendo ${formatearNumero(kmLlegada)}. Los kilómetros no pueden bajar.`,
    }
  }

  return { ok: true }
}

/**
 * Costo del viaje.
 * Regla de CLAUDE.md: km recorridos × costoKmEstimado + peajes.
 */
export function costoDelViaje(
  kmSalida: number | null,
  kmLlegada: number | null,
  costoKmEstimado: number | null,
  peajes: number,
): number {
  if (kmSalida === null || kmLlegada === null || costoKmEstimado === null) {
    return peajes
  }
  const recorridos = Math.max(0, kmLlegada - kmSalida)
  return recorridos * costoKmEstimado + peajes
}

/* --------------------------- MANTENIMIENTO -------------------------- */

export interface ProximoService {
  porKm: number | null
  porFecha: Date | null
  /** Lo que ocurra primero. */
  vence: 'km' | 'fecha' | null
  kmRestantes: number | null
  diasRestantes: number | null
  urgente: boolean
}

const AVISO_KM = 1000
const AVISO_DIAS = 15

/** Cuándo toca el próximo service: lo que ocurra primero, km o fecha. */
export function proximoService(
  kmActual: number,
  proximoKm: number | null,
  proximaFecha: Date | null,
): ProximoService {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const kmRestantes = proximoKm !== null ? proximoKm - kmActual : null
  const diasRestantes =
    proximaFecha !== null
      ? Math.round((proximaFecha.getTime() - hoy.getTime()) / 86_400_000)
      : null

  const porKmUrgente = kmRestantes !== null && kmRestantes <= AVISO_KM
  const porFechaUrgente = diasRestantes !== null && diasRestantes <= AVISO_DIAS

  let vence: 'km' | 'fecha' | null = null
  if (porKmUrgente && porFechaUrgente) {
    // El que esté más cerca en términos relativos.
    vence = (kmRestantes ?? 0) / AVISO_KM <= (diasRestantes ?? 0) / AVISO_DIAS ? 'km' : 'fecha'
  } else if (porKmUrgente) vence = 'km'
  else if (porFechaUrgente) vence = 'fecha'
  else if (kmRestantes !== null) vence = 'km'
  else if (diasRestantes !== null) vence = 'fecha'

  return {
    porKm: proximoKm,
    porFecha: proximaFecha,
    vence,
    kmRestantes,
    diasRestantes,
    urgente: porKmUrgente || porFechaUrgente,
  }
}

/* --------------------------- COMBUSTIBLE ---------------------------- */

export interface Carga {
  fecha: Date
  litros: number
  km: number | null
}

/**
 * Consumo promedio en litros cada 100 km, calculado entre cargas.
 *
 * Solo se puede calcular cuando hay dos cargas seguidas con kilometraje:
 * la primera carga de un vehículo nunca dice nada.
 */
export function consumoPromedio(cargas: Carga[]): number | null {
  const conKm = cargas
    .filter((c) => c.km !== null && c.km > 0)
    .sort((a, b) => (a.km as number) - (b.km as number))

  if (conKm.length < 2) return null

  let litrosTotales = 0
  let kmTotales = 0

  for (let i = 1; i < conKm.length; i++) {
    const km = (conKm[i].km as number) - (conKm[i - 1].km as number)
    // Tramos absurdos (odómetro reseteado, error de tipeo) se descartan.
    if (km <= 0 || km > 5000) continue
    kmTotales += km
    litrosTotales += conKm[i].litros
  }

  if (kmTotales === 0) return null
  return (litrosTotales / kmTotales) * 100
}

/**
 * Si las últimas cargas están muy por encima de lo que el vehículo venía
 * consumiendo.
 *
 * El histórico se calcula SIN las cargas recientes. Si se las incluyera,
 * el pico se promediaría consigo mismo y una pérdida importante podría
 * pasar desapercibida.
 */
export function consumoAnormal(
  cargas: Carga[],
  umbralPorcentaje = 25,
  cantidadRecientes = 3,
): { anormal: boolean; promedio: number | null; reciente: number | null } {
  const porFecha = [...cargas].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime(),
  )

  const recientes = porFecha.slice(0, cantidadRecientes)
  const historicas = porFecha.slice(cantidadRecientes - 1)

  // Hacen falta al menos dos tramos de cada lado para comparar algo.
  if (historicas.length < 2 || recientes.length < 2) {
    return { anormal: false, promedio: consumoPromedio(cargas), reciente: null }
  }

  const promedio = consumoPromedio(historicas)
  const reciente = consumoPromedio(recientes)

  if (promedio === null || reciente === null) {
    return { anormal: false, promedio, reciente }
  }

  return {
    anormal: reciente > promedio * (1 + umbralPorcentaje / 100),
    promedio,
    reciente,
  }
}

/* ----------------------------- FORMATO ------------------------------ */
// Copias mínimas para que este archivo no dependa de lib/formato, que
// arrastra date-fns y no hace falta acá.

function formatearFecha(f: Date): string {
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`
}

function formatearHora(f: Date): string {
  return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`
}

function formatearNumero(n: number): string {
  return n.toLocaleString('es-AR')
}

function formatearPeso(kg: number): string {
  return kg >= 1000
    ? `${(kg / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} t`
    : `${formatearNumero(kg)} kg`
}
