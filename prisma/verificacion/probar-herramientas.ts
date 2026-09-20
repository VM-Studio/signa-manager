/**
 * Recorrido completo del módulo de herramientas, contra las mismas
 * funciones puras que usan las Server Actions.
 *
 * Pedir → resolver con stock → entregar → transferir → devolver,
 * y las validaciones que tienen que bloquear.
 */
import './sin-server-only'
import {
  Condicion,
  EstadoHerramienta,
  TipoControlHerramienta,
} from '@prisma/client'
import {
  accionesPosibles,
  accionMasProbable,
  aplicarMovimiento,
  cambiosDeStock,
  validarMovimiento,
  type EstadoActual,
} from '../../src/server/herramientas/movimientos'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

const enDeposito: EstadoActual = {
  id: 'h1', codigo: 'SIG-H-0042', nombre: 'Amoladora',
  estado: EstadoHerramienta.DISPONIBLE,
  tipoControl: TipoControlHerramienta.UNITARIO,
  depositoId: 'dep-central', obraId: null,
}

const enObra: EstadoActual = {
  ...enDeposito,
  estado: EstadoHerramienta.EN_OBRA,
  depositoId: null, obraId: 'obra-A',
}

const enTaller: EstadoActual = {
  ...enDeposito,
  estado: EstadoHerramienta.EN_REPARACION,
  depositoId: null, obraId: null,
}

console.log('\n  ── Qué se puede hacer según el estado ──\n')
ok(accionesPosibles(enDeposito).includes('ENTREGAR'), 'En depósito se puede entregar')
ok(!accionesPosibles(enDeposito).includes('DEVOLVER'), 'En depósito NO se puede devolver')
ok(accionesPosibles(enObra).includes('DEVOLVER'), 'En obra se puede devolver')
ok(accionesPosibles(enObra).includes('TRANSFERIR'), 'En obra se puede transferir')
ok(!accionesPosibles(enObra).includes('ENTREGAR'), 'En obra NO se puede volver a entregar')
ok(accionMasProbable(enDeposito) === 'ENTREGAR', 'Al escanear una en depósito se sugiere entregar')
ok(accionMasProbable(enObra) === 'DEVOLVER', 'Al escanear una en obra se sugiere devolver')
ok(accionesPosibles({ ...enDeposito, estado: EstadoHerramienta.BAJA }).length === 0, 'Una dada de baja no se puede mover')

console.log('\n  ── Validaciones que bloquean ──\n')
const entregarLaQueEstaEnObra = validarMovimiento(enObra, { accion: 'ENTREGAR', obraDestinoId: 'obra-B' })
ok(!entregarLaQueEstaEnObra.ok, 'No se entrega algo que no está disponible')
if (!entregarLaQueEstaEnObra.ok) console.log(`    "${entregarLaQueEstaEnObra.error}"`)

const sinObra = validarMovimiento(enDeposito, { accion: 'ENTREGAR' })
ok(!sinObra.ok, 'Entregar sin elegir obra se rechaza')

const devolverSinCondicion = validarMovimiento(enObra, { accion: 'DEVOLVER', depositoDestinoId: 'dep-central' })
ok(!devolverSinCondicion.ok, 'Devolver sin indicar la condición se rechaza')

const bajaSinMotivo = validarMovimiento(enDeposito, { accion: 'DAR_DE_BAJA' })
ok(!bajaSinMotivo.ok, 'Dar de baja sin motivo se rechaza')
if (!bajaSinMotivo.ok) console.log(`    "${bajaSinMotivo.error}"`)

const extravioSinMotivo = validarMovimiento(enObra, { accion: 'MARCAR_EXTRAVIADA' })
ok(!extravioSinMotivo.ok, 'Marcar extraviada sin motivo se rechaza')

const transferirALaMisma = validarMovimiento(enObra, { accion: 'TRANSFERIR', obraDestinoId: 'obra-A' })
ok(!transferirALaMisma.ok, 'Transferir a la misma obra se rechaza')

console.log('\n  ── El recorrido ──\n')

// 1. Entregar a obra
const entrega = aplicarMovimiento(enDeposito, {
  accion: 'ENTREGAR',
  obraDestinoId: 'obra-A',
  empleadoId: 'emp-1',
  fechaDevolucionPrevista: new Date('2026-10-15'),
})
ok(entrega.herramienta.estado === EstadoHerramienta.EN_OBRA, 'Entregar → queda EN_OBRA')
ok(entrega.herramienta.depositoId === null && entrega.herramienta.obraId === 'obra-A', 'Entregar → sale del depósito y entra a la obra, nunca en las dos')
ok(entrega.herramienta.responsableActualId === 'emp-1', 'Entregar → queda con responsable')
ok(entrega.movimiento.origenDepositoId === 'dep-central' && entrega.movimiento.destinoObraId === 'obra-A', 'El movimiento registra de dónde a dónde')

// 2. Transferir entre obras, sin pasar por el depósito
const transferencia = aplicarMovimiento(enObra, {
  accion: 'TRANSFERIR',
  obraDestinoId: 'obra-B',
  empleadoId: 'emp-2',
})
ok(transferencia.movimiento.origenObraId === 'obra-A' && transferencia.movimiento.destinoObraId === 'obra-B', 'Transferir → va de obra a obra')
ok(transferencia.movimiento.destinoDepositoId === null && transferencia.movimiento.origenDepositoId === null, 'Transferir → no pasa por el depósito')

// 3. Devolver en buena condición
const devolucion = aplicarMovimiento(enObra, {
  accion: 'DEVOLVER',
  depositoDestinoId: 'dep-central',
  condicion: Condicion.BUENA,
})
ok(devolucion.herramienta.estado === EstadoHerramienta.DISPONIBLE, 'Devolver → queda DISPONIBLE')
ok(devolucion.herramienta.obraId === null && devolucion.herramienta.depositoId === 'dep-central', 'Devolver → vuelve al depósito')
ok(devolucion.herramienta.responsableActualId === null, 'Devolver → se libera el responsable')
ok(devolucion.herramienta.fechaDevolucionPrevista === null, 'Devolver → se limpia la fecha de devolución')
ok(!devolucion.sugerirReparacion, 'Devolver en buena condición no sugiere taller')

// 4. Devolver en mala condición
const devolucionMala = aplicarMovimiento(enObra, {
  accion: 'DEVOLVER',
  depositoDestinoId: 'dep-central',
  condicion: Condicion.MALA,
})
ok(devolucionMala.sugerirReparacion, 'Devolver en mala condición SÍ ofrece mandarla al taller')

// 5. Reparación
const alTaller = aplicarMovimiento(enDeposito, {
  accion: 'ENVIAR_A_REPARACION',
  observaciones: 'No arranca',
})
ok(alTaller.herramienta.estado === EstadoHerramienta.EN_REPARACION, 'Al taller → EN_REPARACION')
ok(alTaller.herramienta.depositoId === null && alTaller.herramienta.obraId === null, 'En el taller no está ni en depósito ni en obra')

const vuelve = aplicarMovimiento(enTaller, {
  accion: 'VOLVIO_DE_REPARACION',
  depositoDestinoId: 'dep-central',
  condicion: Condicion.BUENA,
})
ok(vuelve.herramienta.estado === EstadoHerramienta.DISPONIBLE && vuelve.herramienta.depositoId === 'dep-central', 'Vuelve del taller → disponible en el depósito')

// 6. Baja
const baja = aplicarMovimiento(enDeposito, {
  accion: 'DAR_DE_BAJA',
  observaciones: 'Rotura irreparable',
})
ok(baja.herramienta.estado === EstadoHerramienta.BAJA, 'Baja → estado BAJA')
ok(baja.herramienta.depositoId === null && baja.herramienta.obraId === null, 'Una dada de baja no ocupa lugar')
ok(baja.movimiento.observaciones === 'Rotura irreparable', 'El motivo queda en el movimiento')

console.log('\n  ── Herramientas por cantidad ──\n')
const porCantidad: EstadoActual = {
  id: 'h2', codigo: 'SIG-H-0121', nombre: 'Pala ancha',
  estado: EstadoHerramienta.DISPONIBLE,
  tipoControl: TipoControlHerramienta.CANTIDAD,
  depositoId: null, obraId: null,
}

ok(accionesPosibles(porCantidad).length === 2, 'Por cantidad solo se entrega y se devuelve')

const sinCantidad = validarMovimiento(porCantidad, { accion: 'ENTREGAR', obraDestinoId: 'obra-A', cantidad: 0 })
ok(!sinCantidad.ok, 'Entregar 0 unidades se rechaza')

const movimientosStock = cambiosDeStock('h2', porCantidad, {
  accion: 'ENTREGAR',
  obraDestinoId: 'obra-A',
  depositoDestinoId: 'dep-central',
  cantidad: 5,
})
ok(movimientosStock.length === 2, 'Entregar por cantidad genera dos cambios de stock')
ok(movimientosStock[0].delta === -5 && movimientosStock[0].depositoId === 'dep-central', 'Descuenta 5 del depósito')
ok(movimientosStock[1].delta === 5 && movimientosStock[1].obraId === 'obra-A', 'Suma 5 a la obra')

const devolverStock = cambiosDeStock('h2', porCantidad, {
  accion: 'DEVOLVER',
  obraDestinoId: 'obra-A',
  depositoDestinoId: 'dep-central',
  cantidad: 3,
})
ok(devolverStock[0].delta === -3 && devolverStock[0].obraId === 'obra-A', 'Devolver descuenta de la obra')
ok(devolverStock[1].delta === 3 && devolverStock[1].depositoId === 'dep-central', 'Devolver suma al depósito')
console.log()
