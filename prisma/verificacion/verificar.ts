import { PrismaClient, EstadoHerramienta, TipoControlHerramienta, EstadoParte } from '@prisma/client'
const db = new PrismaClient()
const ok = (c: boolean, t: string) => console.log(`${c ? '✔' : '✖'} ${t}`)

async function main() {
  // --- regla de ubicación: UNITARIA en depósito O en obra, nunca las dos ni ninguna ---
  const malUbicadas = await db.herramienta.count({
    where: {
      tipoControl: TipoControlHerramienta.UNITARIO,
      estado: { notIn: [EstadoHerramienta.EXTRAVIADA, EstadoHerramienta.BAJA, EstadoHerramienta.EN_REPARACION] },
      OR: [
        { AND: [{ depositoId: { not: null } }, { obraId: { not: null } }] },
        { AND: [{ depositoId: null }, { obraId: null }] },
      ],
    },
  })
  ok(malUbicadas === 0, `Ubicación de herramientas unitarias correcta (${malUbicadas} mal ubicadas)`)

  // --- CANTIDAD nunca tiene ubicación propia ---
  const cantidadConUbicacion = await db.herramienta.count({
    where: { tipoControl: TipoControlHerramienta.CANTIDAD, OR: [{ depositoId: { not: null } }, { obraId: { not: null } }] },
  })
  ok(cantidadConUbicacion === 0, `Herramientas por cantidad sin ubicación propia (${cantidadConUbicacion})`)

  // --- devolución vencida hace 9 días ---
  const hace9 = new Date(); hace9.setHours(0,0,0,0); hace9.setDate(hace9.getDate() - 9)
  const vencidas = await db.herramienta.findMany({
    where: { estado: EstadoHerramienta.EN_OBRA, fechaDevolucionPrevista: hace9 },
    select: { codigo: true, nombre: true },
  })
  ok(vencidas.length === 2, `2 herramientas con devolución vencida hace 9 días → ${vencidas.map(v => `${v.codigo} ${v.nombre}`).join(' | ')}`)

  // --- 4 en obra finalizada ---
  const finalizada = await db.obra.findFirst({ where: { estado: 'FINALIZADA' }, select: { id: true, codigo: true } })
  const enFinalizada = await db.herramienta.count({ where: { obraId: finalizada!.id } })
  ok(enFinalizada === 4, `${enFinalizada} herramientas en la obra finalizada ${finalizada!.codigo}`)

  // --- mantenimiento vencido ---
  const hoy0 = new Date(); hoy0.setHours(0,0,0,0)
  const mantVencido = await db.herramienta.count({ where: { proximoMantenimiento: { lt: hoy0 }, estado: { not: EstadoHerramienta.BAJA } } })
  ok(mantVencido >= 1, `${mantVencido} herramienta(s) con mantenimiento vencido`)

  // --- estados de herramientas ---
  const porEstado = await db.herramienta.groupBy({ by: ['estado'], _count: true })
  console.log('  estados:', porEstado.map(e => `${e.estado}=${e._count}`).join(' '))

  // --- VTV a 5 días / seguro vencido ayer ---
  const en5 = new Date(); en5.setHours(0,0,0,0); en5.setDate(en5.getDate() + 5)
  const ayer = new Date(); ayer.setHours(0,0,0,0); ayer.setDate(ayer.getDate() - 1)
  const vtv = await db.documentoVehiculo.findFirst({ where: { tipo: 'VTV', vencimiento: en5 }, include: { vehiculo: true } })
  const seg = await db.documentoVehiculo.findFirst({ where: { tipo: 'SEGURO', vencimiento: ayer }, include: { vehiculo: true } })
  ok(!!vtv, `VTV vence en 5 días → ${vtv?.vehiculo.patente} ${vtv?.vehiculo.marca} ${vtv?.vehiculo.modelo}`)
  ok(!!seg, `Seguro venció ayer → ${seg?.vehiculo.patente} ${seg?.vehiculo.marca} ${seg?.vehiculo.modelo}`)

  // --- licencia chofer a 10 días ---
  const en10 = new Date(); en10.setHours(0,0,0,0); en10.setDate(en10.getDate() + 10)
  const lic = await db.documentoEmpleado.findFirst({ where: { tipo: 'LICENCIA_CONDUCIR', vencimiento: en10 }, include: { empleado: true } })
  ok(!!lic, `Licencia vence en 10 días → ${lic?.empleado.nombre} ${lic?.empleado.apellido}`)

  // --- 2 empleados con documentación vencida ---
  const docsVencidos = await db.documentoEmpleado.findMany({
    where: { vencimiento: { lt: hoy0 }, empleado: { activo: true } },
    select: { empleadoId: true },
  })
  const empleadosVencidos = new Set(docsVencidos.map(d => d.empleadoId))
  ok(empleadosVencidos.size >= 2, `${empleadosVencidos.size} empleados con documentación vencida`)

  // --- obra sin parte de ayer (día hábil) ---
  const ayerHabil = new Date(); ayerHabil.setHours(0,0,0,0)
  do { ayerHabil.setDate(ayerHabil.getDate() - 1) } while (ayerHabil.getDay() === 0 || ayerHabil.getDay() === 6)
  const obrasConGente = await db.obra.findMany({
    where: { estado: 'EN_CURSO', asignaciones: { some: { empleadoId: { not: null } } } },
    select: { id: true, codigo: true, nombre: true },
  })
  const sinParte: string[] = []
  for (const o of obrasConGente) {
    const p = await db.parteDiario.findFirst({ where: { obraId: o.id, fecha: ayerHabil } })
    if (!p) sinParte.push(`${o.codigo} ${o.nombre}`)
  }
  ok(sinParte.length === 1, `${sinParte.length} obra sin parte de ayer (${ayerHabil.toLocaleDateString('es-AR')}) → ${sinParte.join(', ')}`)

  // --- presupuesto mano de obra: 92% y excedida ---
  const obras = await db.obra.findMany({ where: { presupuestoManoObra: { not: null } }, select: { id: true, codigo: true, nombre: true, presupuestoManoObra: true } })
  const consumos: Array<[string, number]> = []
  for (const o of obras) {
    const agg = await db.parteDiarioLinea.aggregate({
      _sum: { costoCalculado: true },
      where: { parte: { obraId: o.id, estado: EstadoParte.APROBADO } },
    })
    const gastado = Number(agg._sum.costoCalculado ?? 0)
    const pres = Number(o.presupuestoManoObra)
    if (gastado > 0) consumos.push([`${o.codigo} ${o.nombre}`, (gastado / pres) * 100])
  }
  consumos.sort((a, b) => b[1] - a[1])
  console.log('  consumo de presupuesto de mano de obra:')
  for (const [n, pct] of consumos) console.log(`    ${pct.toFixed(1).padStart(6)}%  ${n}`)
  ok(consumos.some(([, p]) => p > 100), 'Hay una obra que pasó el 100% del presupuesto')
  ok(consumos.some(([, p]) => p >= 85 && p <= 100), 'Hay una obra entre el 85% y el 100%')

  // --- pedidos plantados ---
  const pendiente = await db.pedidoCompraExterno.findFirst({ where: { numero: 'PC-2411' } })
  const noEntregado = await db.pedidoCompraExterno.findFirst({ where: { numero: 'PC-2398' } })
  ok(!!pendiente && pendiente.estado === 'PENDIENTE_APROBACION', `Pedido sin aprobar hace 6 días → ${pendiente?.numero}`)
  ok(!!noEntregado && !noEntregado.fechaEntregaReal, `Pedido aprobado sin entregar → ${noEntregado?.numero}`)

  // --- solicitud de viaje urgente sin asignar ---
  const urgente = await db.solicitudViaje.count({ where: { estado: 'PENDIENTE', prioridad: 'URGENTE' } })
  ok(urgente === 1, `${urgente} solicitud de viaje urgente sin asignar`)

  // --- compras evitadas ---
  const resueltas = await db.solicitudHerramienta.count({ where: { estado: 'RESUELTA_CON_STOCK' } })
  ok(resueltas === 2, `${resueltas} solicitudes resueltas con stock propio`)

  // --- partes: aprobados tienen costo congelado, borradores no ---
  const aprobadosSinCosto = await db.parteDiarioLinea.count({ where: { parte: { estado: EstadoParte.APROBADO }, costoCalculado: null } })
  const borradorConCosto = await db.parteDiarioLinea.count({ where: { parte: { estado: { not: EstadoParte.APROBADO } }, costoCalculado: { not: null } } })
  ok(aprobadosSinCosto === 0, `Todas las líneas aprobadas tienen costo congelado (${aprobadosSinCosto} sin congelar)`)
  ok(borradorConCosto === 0, `Ninguna línea no aprobada tiene costo congelado (${borradorConCosto})`)

  // --- partes por estado ---
  const porEstadoParte = await db.parteDiario.groupBy({ by: ['estado'], _count: true })
  console.log('  partes:', porEstadoParte.map(e => `${e.estado}=${e._count}`).join(' '))

  // --- resultado económico por obra (para el tablero) ---
  console.log('\n  resultado por obra según movimientos externos:')
  const todas = await db.obra.findMany({ select: { id: true, codigo: true, nombre: true } })
  for (const o of todas) {
    const ing = await db.movimientoExterno.aggregate({ _sum: { monto: true }, where: { obraId: o.id, tipo: 'INGRESO', moneda: 'ARS' } })
    const ingUsd = await db.movimientoExterno.findMany({ where: { obraId: o.id, tipo: 'INGRESO', moneda: 'USD' }, select: { monto: true, tipoCambio: true } })
    const egr = await db.movimientoExterno.aggregate({ _sum: { monto: true }, where: { obraId: o.id, tipo: 'EGRESO' } })
    const ingresos = Number(ing._sum.monto ?? 0) + ingUsd.reduce((a, m) => a + Number(m.monto) * Number(m.tipoCambio ?? 1), 0)
    const egresos = Number(egr._sum.monto ?? 0)
    const margen = ingresos > 0 ? ((ingresos - egresos) / ingresos) * 100 : 0
    console.log(`    ${o.codigo.padEnd(14)} ing ${(ingresos/1e6).toFixed(1).padStart(7)}M  egr ${(egresos/1e6).toFixed(1).padStart(7)}M  margen ${margen.toFixed(1).padStart(6)}%`)
  }
  const estructura = await db.movimientoExterno.aggregate({ _sum: { monto: true }, where: { obraId: null } })
  console.log(`    ESTRUCTURA     ${(Number(estructura._sum.monto ?? 0)/1e6).toFixed(1).padStart(7)}M sin obra`)
}

main().finally(() => db.$disconnect())
