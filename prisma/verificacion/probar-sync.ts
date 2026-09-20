/**
 * Prueba la sincronización con el adaptador mock de punta a punta.
 *
 * Lo que verifica:
 *   · que entren movimientos nuevos en cada corrida
 *   · que NO se pisen los campos que son nuestros (jefe de obra,
 *     presupuesto de mano de obra, ubicación, esInterior)
 *   · que un movimiento con un código de obra inexistente se guarde
 *     igual, sin obra, y se informe
 *   · que un fallo no deje ningún RegistroSync colgado en EN_CURSO
 */
import './sin-server-only'
import { PrismaClient } from '@prisma/client'
import type { SistemaBase } from '../../src/lib/integracion/tipos'

const db = new PrismaClient()
const ok = (c: boolean, t: string) => console.log(`${c ? '✔' : '✖'} ${t}`)

async function main() {
  const { sincronizar } = await import('../../src/lib/integracion/sincronizar')

  // ---- foto de antes ----
  const obra = await db.obra.findFirst({
    where: { origen: 'SISTEMA_BASE', jefeObraId: { not: null } },
    select: {
      id: true, codigo: true, nombre: true, jefeObraId: true,
      presupuestoManoObra: true, direccion: true, localidad: true,
      esInterior: true, ultimaSync: true,
    },
  })
  if (!obra) throw new Error('No hay obras del sistema base para probar')

  const movimientosAntes = await db.movimientoExterno.count()
  const pedidosAntes = await db.pedidoCompraExterno.count()

  console.log(`\n  Obra de prueba: ${obra.codigo} · ${obra.nombre}`)
  console.log(`  jefe=${obra.jefeObraId?.slice(0, 8)} presupuestoMO=${obra.presupuestoManoObra} interior=${obra.esInterior}\n`)

  // ---- corrida 1 ----
  const r1 = await sincronizar()
  ok(r1.ok, `Corrida 1: ${r1.ok ? 'OK' : 'FALLÓ — ' + r1.error} (${r1.obras} obras, ${r1.movimientos} movimientos, ${r1.pedidos} pedidos, ${r1.duracion}ms)`)

  const despues = await db.obra.findUnique({
    where: { id: obra.id },
    select: {
      jefeObraId: true, presupuestoManoObra: true, direccion: true,
      localidad: true, esInterior: true, ultimaSync: true,
    },
  })

  ok(despues?.jefeObraId === obra.jefeObraId, 'El jefe de obra no se pisó')
  ok(String(despues?.presupuestoManoObra) === String(obra.presupuestoManoObra), 'El presupuesto de mano de obra no se pisó')
  ok(despues?.direccion === obra.direccion, 'La dirección no se pisó')
  ok(despues?.localidad === obra.localidad, 'La localidad no se pisó')
  ok(despues?.esInterior === obra.esInterior, 'La marca de interior no se pisó')
  ok(
    despues?.ultimaSync !== null &&
      (obra.ultimaSync === null || despues!.ultimaSync! > obra.ultimaSync),
    'ultimaSync sí se actualizó',
  )

  const movimientosDespues = await db.movimientoExterno.count()
  const nuevos = movimientosDespues - movimientosAntes
  ok(nuevos > 0, `Entraron ${nuevos} movimientos nuevos (${movimientosAntes} → ${movimientosDespues})`)

  // ---- corrida 2: el upsert no tiene que duplicar ----
  const r2 = await sincronizar()
  const movimientosFinal = await db.movimientoExterno.count()
  const nuevos2 = movimientosFinal - movimientosDespues
  ok(r2.ok, `Corrida 2: OK (${r2.movimientos} movimientos procesados)`)
  ok(nuevos2 > 0 && nuevos2 < 6, `La segunda corrida sumó ${nuevos2} movimientos nuevos, sin duplicar los anteriores`)

  const pedidosFinal = await db.pedidoCompraExterno.count()
  console.log(`  pedidos: ${pedidosAntes} → ${pedidosFinal}`)

  // ---- movimiento con obra inexistente ----
  const { sistemaBase } = await import('../../src/lib/integracion')
  const adaptador = sistemaBase('mock')
  const original = adaptador.listarMovimientos.bind(adaptador)
  adaptador.listarMovimientos = async (desde: Date) => {
    const lista = await original(desde)
    return [
      ...lista,
      {
        idExterno: `MV-OBRA-FANTASMA-${Date.now()}`,
        tipo: 'EGRESO' as const,
        categoria: 'MATERIALES' as const,
        fecha: new Date(),
        descripcion: 'Factura de una obra que no existe en el sistema',
        proveedor: 'Proveedor X',
        monto: 1_234_000,
        moneda: 'ARS' as const,
        tipoCambio: null,
        codigoObra: 'SIG-9999-999',
      },
    ]
  }

  const sinObraAntes = await db.movimientoExterno.count({ where: { obraId: null, categoria: 'MATERIALES' } })
  const r3 = await sincronizarCon(adaptador)
  const sinObraDespues = await db.movimientoExterno.count({ where: { obraId: null, categoria: 'MATERIALES' } })

  ok(sinObraDespues > sinObraAntes, 'El movimiento con obra inexistente se guardó igual, sin obra')
  ok(
    r3.advertencias.some((a) => a.includes('SIG-9999-999')),
    `Y se informó: "${r3.advertencias.find((a) => a.includes('SIG-9999-999'))?.slice(0, 90)}…"`,
  )

  // ---- un fallo no deja registros colgados ----
  const roto = sistemaBase('mock')
  roto.listarObras = async () => { throw new Error('Se cayó el proveedor') }
  const r4 = await sincronizarCon(roto)
  ok(!r4.ok, `Una corrida que falla devuelve ok=false: "${r4.error}"`)

  const colgados = await db.registroSync.count({ where: { estado: 'EN_CURSO' } })
  ok(colgados === 0, `No quedó ningún RegistroSync colgado en EN_CURSO (${colgados})`)

  const registros = await db.registroSync.count()
  console.log(`\n  RegistroSync: ${registros} corridas guardadas\n`)
}

/** Corre la sincronización con un adaptador puntual, para poder romperlo. */
async function sincronizarCon(adaptador: SistemaBase) {
  const { sincronizar } = await import('../../src/lib/integracion/sincronizar')
  return sincronizar(undefined, adaptador)
}

main()
  .catch((e) => { console.error('\n✖', e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
