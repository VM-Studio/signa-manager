/**
 * Margen real por obra: ingresos del sistema base contra el costo
 * completo (sistema base + mano de obra + viajes). Es una vista previa
 * de lo que va a mostrar el tablero del prompt 9.
 */
import { PrismaClient, EstadoParte } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const obras = await db.obra.findMany({
    select: { id: true, codigo: true, nombre: true },
    orderBy: { codigo: 'asc' },
  })

  console.log('\n  obra            ingresos    externo   m.obra    viajes     total   margen')
  console.log('  ' + '─'.repeat(76))

  let tIng = 0, tCosto = 0

  for (const o of obras) {
    const ingArs = await db.movimientoExterno.aggregate({
      _sum: { monto: true },
      where: { obraId: o.id, tipo: 'INGRESO', moneda: 'ARS' },
    })
    const ingUsd = await db.movimientoExterno.findMany({
      where: { obraId: o.id, tipo: 'INGRESO', moneda: 'USD' },
      select: { monto: true, tipoCambio: true },
    })
    const egr = await db.movimientoExterno.aggregate({
      _sum: { monto: true },
      where: { obraId: o.id, tipo: 'EGRESO' },
    })
    const partes = await db.parteDiario.findMany({
      where: { obraId: o.id, estado: EstadoParte.APROBADO },
      select: { id: true },
    })
    const mo = partes.length
      ? await db.parteDiarioLinea.aggregate({
          _sum: { costoCalculado: true },
          where: { parteId: { in: partes.map((p) => p.id) } },
        })
      : { _sum: { costoCalculado: null } }
    const viajes = await db.viaje.aggregate({
      _sum: { costoCalculado: true },
      where: { obraId: o.id, estado: 'FINALIZADO' },
    })

    const ingresos = Number(ingArs._sum.monto ?? 0) +
      ingUsd.reduce((a, m) => a + Number(m.monto) * Number(m.tipoCambio ?? 1), 0)
    const externo = Number(egr._sum.monto ?? 0)
    const manoObra = Number(mo._sum.costoCalculado ?? 0)
    const costoViajes = Number(viajes._sum.costoCalculado ?? 0)
    const total = externo + manoObra + costoViajes
    const margen = ingresos > 0 ? ((ingresos - total) / ingresos) * 100 : 0

    tIng += ingresos
    tCosto += total

    const M = (n: number) => (n / 1e6).toFixed(1).padStart(8)
    console.log(
      `  ${o.codigo.padEnd(14)}${M(ingresos)}  ${M(externo)} ${M(manoObra)} ${M(costoViajes)} ${M(total)}  ${margen.toFixed(1).padStart(6)}%`,
    )
  }

  const estructura = await db.movimientoExterno.aggregate({
    _sum: { monto: true },
    where: { obraId: null },
  })
  const est = Number(estructura._sum.monto ?? 0)

  console.log('  ' + '─'.repeat(76))
  console.log(`  TOTAL OBRAS   ${(tIng/1e6).toFixed(1).padStart(8)}  ${' '.repeat(28)}${(tCosto/1e6).toFixed(1).padStart(8)}  ${(((tIng-tCosto)/tIng)*100).toFixed(1).padStart(6)}%`)
  console.log(`  ESTRUCTURA    ${' '.repeat(8)}  ${' '.repeat(28)}${(est/1e6).toFixed(1).padStart(8)}`)
  console.log(`  RESULTADO EMPRESA: ${((tIng - tCosto - est)/1e6).toFixed(1)}M sobre ${(tIng/1e6).toFixed(1)}M de ingresos → ${(((tIng-tCosto-est)/tIng)*100).toFixed(1)}%\n`)
}

main().finally(() => db.$disconnect())
