/**
 * Las reglas de viajes: qué bloquea, cómo se ordenan las propuestas y
 * cómo se calcula el costo. Contra las mismas funciones que usan las
 * Server Actions.
 */
import './sin-server-only'
import { EstadoVehiculo, EstadoViaje, TipoDocumentoVehiculo } from '@prisma/client'
import {
  bloqueosDelChofer,
  bloqueosDelVehiculo,
  consumoPromedio,
  consumoAnormal,
  costoDelViaje,
  proponerVehiculos,
  proximoService,
  validarFin,
  validarInicio,
  type VehiculoParaAsignar,
} from '../../src/server/vehiculos/reglas'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

const camion = (cambios: Partial<VehiculoParaAsignar> = {}): VehiculoParaAsignar => ({
  id: 'v1',
  patente: 'AB123CD',
  tipo: 'CAMION',
  marca: 'Iveco',
  modelo: 'Tector',
  estado: EstadoVehiculo.DISPONIBLE,
  capacidadCargaKg: 8500,
  cantidadPasajeros: 2,
  costoKmEstimado: 860,
  documentosVencidos: [],
  viajesSuperpuestos: [],
  ...cambios,
})

const pedido = { pesoCargaKg: 4200, cantidadPersonas: null, salidaPrevista: new Date() }

console.log('\n  ── Qué bloquea un vehículo ──\n')

ok(bloqueosDelVehiculo(camion(), pedido).length === 0, 'Un camión libre y al día no tiene bloqueos')

const conSeguroVencido = bloqueosDelVehiculo(
  camion({ documentosVencidos: [{ tipo: TipoDocumentoVehiculo.SEGURO, vencimiento: new Date(2026, 8, 19) }] }),
  pedido,
)
ok(conSeguroVencido.some((b) => b.motivo === 'seguro'), 'El seguro vencido BLOQUEA')
console.log(`    "${conSeguroVencido[0].mensaje}"`)

const conVtvVencida = bloqueosDelVehiculo(
  camion({ documentosVencidos: [{ tipo: TipoDocumentoVehiculo.VTV, vencimiento: new Date(2026, 8, 10) }] }),
  pedido,
)
ok(conVtvVencida.some((b) => b.motivo === 'vtv'), 'La VTV vencida BLOQUEA')

const enTaller = bloqueosDelVehiculo(camion({ estado: EstadoVehiculo.EN_TALLER }), pedido)
ok(enTaller.some((b) => b.motivo === 'estado'), 'Un vehículo en el taller BLOQUEA')

const sinCapacidad = bloqueosDelVehiculo(camion({ capacidadCargaKg: 1000 }), pedido)
ok(sinCapacidad.some((b) => b.motivo === 'capacidad'), 'Carga mayor a la capacidad BLOQUEA')
console.log(`    "${sinCapacidad[0].mensaje}"`)

const superpuesto = bloqueosDelVehiculo(
  camion({ viajesSuperpuestos: [{ id: 'x', destino: 'Obra Santa Rita', salida: new Date(2026, 8, 20, 9) }] }),
  pedido,
)
ok(superpuesto.some((b) => b.motivo === 'superpuesto'), 'Dos viajes al mismo tiempo BLOQUEA')

const muchasPersonas = bloqueosDelVehiculo(
  camion({ cantidadPasajeros: 2 }),
  { pesoCargaKg: null, cantidadPersonas: 6, salidaPrevista: new Date() },
)
ok(muchasPersonas.some((b) => b.motivo === 'pasajeros'), 'Más personas que lugares BLOQUEA')

console.log('\n  ── Qué bloquea un chofer ──\n')
const licenciaVencida = bloqueosDelChofer({
  id: 'c1', nombre: 'Roberto', apellido: 'Ledesma',
  licenciaVence: new Date(2026, 8, 1), viajesSuperpuestos: [],
})
ok(licenciaVencida.length > 0, 'La licencia vencida BLOQUEA')
console.log(`    "${licenciaVencida[0].mensaje}"`)

const licenciaAlDia = bloqueosDelChofer({
  id: 'c1', nombre: 'Roberto', apellido: 'Ledesma',
  licenciaVence: new Date(2027, 0, 1), viajesSuperpuestos: [],
})
ok(licenciaAlDia.length === 0, 'Con la licencia al día no hay bloqueo')

console.log('\n  ── Orden de las propuestas ──\n')
// Lo que resuelve: no mandar un camión de 15 t a llevar 300 kg.
const flota = [
  camion({ id: 'grande', patente: 'GG111GG', capacidadCargaKg: 15000 }),
  camion({ id: 'chico', patente: 'CC111CC', capacidadCargaKg: 3500 }),
  camion({ id: 'medio', patente: 'MM111MM', capacidadCargaKg: 8500 }),
  camion({ id: 'roto', patente: 'RR111RR', capacidadCargaKg: 15000, estado: EstadoVehiculo.EN_TALLER }),
]

const propuestas = proponerVehiculos(flota, { pesoCargaKg: 3000, cantidadPersonas: null, salidaPrevista: new Date() })
ok(propuestas[0].vehiculo.id === 'chico', 'Para 3.000 kg propone primero el de 3.500')
ok(propuestas[1].vehiculo.id === 'medio', '  después el de 8.500')
ok(propuestas[2].vehiculo.id === 'grande', '  y después el de 15.000')
ok(!propuestas[3].sirve && propuestas[3].vehiculo.id === 'roto', 'El que está en el taller va último y marcado')

const paraMucho = proponerVehiculos(flota, { pesoCargaKg: 9000, cantidadPersonas: null, salidaPrevista: new Date() })
ok(paraMucho[0].vehiculo.id === 'grande', 'Para 9.000 kg el de 3.500 y el de 8.500 ya no sirven')
ok(paraMucho.filter((p) => p.sirve).length === 1, '  solo queda uno que sirve')

console.log('\n  ── Iniciar y finalizar ──\n')
ok(validarInicio(EstadoViaje.PROGRAMADO, 120500, 120000).ok, 'Se inicia un viaje programado')
ok(!validarInicio(EstadoViaje.EN_CURSO, 120500, 120000).ok, 'No se inicia dos veces')
ok(!validarInicio(EstadoViaje.PROGRAMADO, 100, 120000).ok, 'Km muy por debajo del último se rechaza')

const fin = validarFin(EstadoViaje.EN_CURSO, 120500, 120300)
ok(!fin.ok, 'Los kilómetros no pueden bajar')
if (!fin.ok) console.log(`    "${fin.error}"`)
ok(validarFin(EstadoViaje.EN_CURSO, 120500, 120640).ok, 'Con km mayores se cierra bien')
ok(!validarFin(EstadoViaje.PROGRAMADO, null, 100).ok, 'No se cierra lo que no arrancó')

console.log('\n  ── Costo del viaje ──\n')
// Regla de CLAUDE.md: km recorridos x costoKm + peajes
ok(costoDelViaje(120500, 120640, 860, 0) === 140 * 860, '140 km a $860 → $120.400')
ok(costoDelViaje(120500, 120640, 860, 8000) === 140 * 860 + 8000, '  más $8.000 de peajes')
ok(costoDelViaje(null, null, 860, 5000) === 5000, 'Sin kilómetros, solo los peajes')

console.log('\n  ── Próximo service ──\n')
const cerca = proximoService(120000, 120800, null)
ok(cerca.urgente && cerca.vence === 'km', 'A 800 km del service: urgente por km')

const hoy = new Date()
const en10dias = new Date(hoy.getTime() + 10 * 86_400_000)
const porFecha = proximoService(120000, 140000, en10dias)
ok(porFecha.urgente && porFecha.vence === 'fecha', 'A 10 días: urgente por fecha')

const lejos = proximoService(120000, 135000, new Date(hoy.getTime() + 180 * 86_400_000))
ok(!lejos.urgente, 'A 15.000 km y 6 meses: todavía no')

console.log('\n  ── Consumo ──\n')
const cargas = [
  { fecha: new Date(2026, 8, 1), litros: 100, km: 100000 },
  { fecha: new Date(2026, 8, 8), litros: 90, km: 100500 },
  { fecha: new Date(2026, 8, 15), litros: 95, km: 101000 },
]
const promedio = consumoPromedio(cargas)
ok(promedio !== null && Math.abs(promedio - 18.5) < 0.1, `Consumo promedio: ${promedio?.toFixed(1)} L/100 km`)

ok(consumoPromedio([cargas[0]]) === null, 'Con una sola carga no se puede calcular')

const conPico = [
  ...cargas,
  { fecha: new Date(2026, 8, 20), litros: 160, km: 101400 },
]
ok(consumoAnormal(conPico).anormal, 'Un pico del 25% sobre el propio promedio se detecta')
console.log()
