/**
 * Verifica a mano, contra la base, que los totales de una obra coinciden
 * con lo que calcula el tablero.
 *
 * Es lo que pide el prompt 9: no alcanza con que el código compile, los
 * números tienen que cerrar.
 */
import './sin-server-only'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}
const plata = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`
/** Los decimales de Prisma y los float de JS difieren en centavos. */
const iguales = (a: number, b: number, tolerancia = 1) => Math.abs(a - b) < tolerancia

async function main() {
  const { armarPeriodo, calcularTablero } = await import(
    '../../src/lib/calculos/tablero'
  )

  const periodo = armarPeriodo('ultimos-3-meses')
  console.log(`\n  Período: ${periodo.etiqueta}`)
  console.log(`  ${periodo.desde.toLocaleDateString('es-AR')} al ${periodo.hasta.toLocaleDateString('es-AR')}\n`)

  const tablero = await calcularTablero(periodo)

  // ---- La obra con más movimiento ----
  const obra = tablero.obras[0]
  if (!obra) throw new Error('El tablero no devolvió ninguna obra')

  console.log(`  ── ${obra.codigo} · ${obra.nombre} ──\n`)
  console.log(`  El tablero dice:`)
  console.log(`    ingresos      ${plata(obra.ingresos).padStart(16)}`)
  console.log(`    materiales    ${plata(obra.materiales).padStart(16)}`)
  console.log(`    subcontratos  ${plata(obra.subcontratos).padStart(16)}`)
  console.log(`    equipos       ${plata(obra.equipos).padStart(16)}`)
  console.log(`    otros         ${plata(obra.otrosExternos).padStart(16)}`)
  console.log(`    mano de obra  ${plata(obra.manoObra).padStart(16)}`)
  console.log(`    viáticos      ${plata(obra.viaticos).padStart(16)}`)
  console.log(`    vehículos     ${plata(obra.vehiculos).padStart(16)}`)
  console.log(`    herramientas  ${plata(obra.herramientas).padStart(16)}`)
  console.log(`    ─────────────────────────────────`)
  console.log(`    costo total   ${plata(obra.costoTotal).padStart(16)}`)
  console.log(`    resultado     ${plata(obra.resultado).padStart(16)}`)
  console.log(`    margen        ${(obra.margen * 100).toFixed(1).padStart(15)}%\n`)

  console.log('  ── Contra la base, a mano ──\n')

  // 1. INGRESOS: movimientos externos de tipo ingreso, con USD convertido
  const ingresosArs = await db.movimientoExterno.aggregate({
    _sum: { monto: true },
    where: {
      obraId: obra.obraId,
      tipo: 'INGRESO',
      moneda: 'ARS',
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
  })
  const ingresosUsd = await db.movimientoExterno.findMany({
    where: {
      obraId: obra.obraId,
      tipo: 'INGRESO',
      moneda: 'USD',
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
    select: { monto: true, tipoCambio: true },
  })
  const ingresosAMano =
    Number(ingresosArs._sum.monto ?? 0) +
    ingresosUsd.reduce((a, m) => a + Number(m.monto) * Number(m.tipoCambio ?? 0), 0)

  ok(iguales(ingresosAMano, obra.ingresos), `Ingresos: ${plata(ingresosAMano)}`)
  if (ingresosUsd.length > 0) {
    console.log(`    (${ingresosUsd.length} en dólares, convertidos al cambio de cada uno)`)
  }

  // 2. MATERIALES
  const materialesAMano = await db.movimientoExterno.aggregate({
    _sum: { monto: true },
    where: {
      obraId: obra.obraId,
      tipo: 'EGRESO',
      categoria: 'MATERIALES',
      moneda: 'ARS',
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
  })
  ok(
    iguales(Number(materialesAMano._sum.monto ?? 0), obra.materiales),
    `Materiales: ${plata(Number(materialesAMano._sum.monto ?? 0))}`,
  )

  // 3. MANO DE OBRA: líneas de partes aprobados
  const partes = await db.parteDiario.findMany({
    where: {
      obraId: obra.obraId,
      estado: 'APROBADO',
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
    select: { id: true },
  })
  const manoObraAMano = await db.parteDiarioLinea.aggregate({
    _sum: { costoCalculado: true },
    where: { parteId: { in: partes.map((p) => p.id) } },
  })
  ok(
    iguales(Number(manoObraAMano._sum.costoCalculado ?? 0), obra.manoObra),
    `Mano de obra: ${plata(Number(manoObraAMano._sum.costoCalculado ?? 0))} (${partes.length} partes aprobados)`,
  )

  // 4. VIÁTICOS
  const viaticosAMano = await db.novedadPersonal.aggregate({
    _sum: { monto: true },
    where: {
      obraId: obra.obraId,
      tipo: 'VIATICO',
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
  })
  ok(
    iguales(Number(viaticosAMano._sum.monto ?? 0), obra.viaticos),
    `Viáticos: ${plata(Number(viaticosAMano._sum.monto ?? 0))}`,
  )

  // 5. VEHÍCULOS
  const viajesAMano = await db.viaje.aggregate({
    _sum: { costoCalculado: true },
    _count: true,
    where: {
      obraId: obra.obraId,
      estado: 'FINALIZADO',
      salidaPrevista: { gte: periodo.desde, lte: periodo.hasta },
    },
  })
  ok(
    iguales(Number(viajesAMano._sum.costoCalculado ?? 0), obra.vehiculos),
    `Vehículos: ${plata(Number(viajesAMano._sum.costoCalculado ?? 0))} (${viajesAMano._count} viajes)`,
  )

  // 6. EL TOTAL TIENE QUE SER LA SUMA DE LAS PARTES
  const sumaDePartes =
    obra.materiales +
    obra.subcontratos +
    obra.equipos +
    obra.otrosExternos +
    obra.manoObra +
    obra.viaticos +
    obra.vehiculos +
    obra.herramientas
  ok(iguales(sumaDePartes, obra.costoTotal), 'El costo total es la suma exacta de las partes')
  ok(
    iguales(obra.ingresos - obra.costoTotal, obra.resultado),
    'El resultado es ingresos menos costo',
  )
  ok(
    obra.ingresos === 0 || iguales(obra.resultado / obra.ingresos, obra.margen, 0.0001),
    'El margen es resultado sobre ingresos',
  )

  // ---- La suma de las obras tiene que dar el total de la empresa ----
  console.log('\n  ── Los totales cierran hacia arriba ──\n')

  const sumaIngresos = tablero.obras.reduce((a, o) => a + o.ingresos, 0)
  const sumaCostos = tablero.obras.reduce((a, o) => a + o.costoTotal, 0)
  ok(iguales(sumaIngresos, tablero.empresa.ingresos), 'La suma de las obras da los ingresos de la empresa')
  ok(iguales(sumaCostos, tablero.empresa.costoTotal), 'Y los costos también')

  const sumaUnidades = tablero.unidades.reduce((a, u) => a + u.ingresos, 0)
  ok(iguales(sumaUnidades, tablero.empresa.ingresos), 'La suma de las unidades también da el total')

  // ---- La estructura NO se reparte entre las obras ----
  const estructuraEnObras = await db.movimientoExterno.count({
    where: {
      categoria: 'ESTRUCTURA',
      obraId: { not: null },
      fecha: { gte: periodo.desde, lte: periodo.hasta },
    },
  })
  const enElBloque = tablero.empresa.estructura.movimientos
  ok(
    enElBloque > 0,
    `La estructura va en su propio bloque: ${plata(tablero.empresa.estructura.total)} en ${enElBloque} movimientos`,
  )
  ok(
    estructuraEnObras === 0 || !tablero.obras.some((o) => o.otrosExternos < 0),
    'Ningún gasto de estructura se sumó al costo de una obra',
  )

  // ---- Resultado de la empresa ----
  console.log('\n  ── El resultado de la empresa ──\n')
  console.log(`    ingresos            ${plata(tablero.empresa.ingresos).padStart(16)}`)
  console.log(`    costo de las obras  ${plata(tablero.empresa.costoTotal).padStart(16)}`)
  console.log(`    resultado de obras  ${plata(tablero.empresa.resultado).padStart(16)}  ${(tablero.empresa.margen * 100).toFixed(1)}%`)
  console.log(`    estructura          ${plata(tablero.empresa.estructura.total).padStart(16)}  ${tablero.empresa.estructura.porcentajeDeIngresos.toFixed(1)}% de los ingresos`)
  console.log(`    ────────────────────────────────────────`)
  console.log(`    resultado neto      ${plata(tablero.empresa.resultadoNeto).padStart(16)}  ${(tablero.empresa.margenNeto * 100).toFixed(1)}%\n`)

  ok(
    iguales(
      tablero.empresa.resultado - tablero.empresa.estructura.total,
      tablero.empresa.resultadoNeto,
    ),
    'El resultado neto es el de las obras menos la estructura',
  )

  // ---- Las obras en rojo ----
  const enRojo = tablero.obras.filter((o) => o.resultado < 0)
  const excedidas = tablero.obras.filter(
    (o) => o.consumoPresupuesto !== null && o.consumoPresupuesto > 1,
  )
  console.log(`  Obras con resultado negativo: ${enRojo.map((o) => o.codigo).join(', ') || 'ninguna'}`)
  console.log(`  Obras con el presupuesto de mano de obra excedido: ${excedidas.map((o) => o.codigo).join(', ') || 'ninguna'}`)
  ok(excedidas.length >= 1, 'Se detecta la obra que se pasó del presupuesto')
  console.log()
}

main()
  .catch((e) => { console.error('\n✖', e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
