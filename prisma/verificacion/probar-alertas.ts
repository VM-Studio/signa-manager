/**
 * Corre el motor de alertas contra los datos del seed y muestra cuántas
 * generó cada regla.
 *
 * Tienen que aparecer TODOS los problemas plantados en el prompt 2.
 */
import './sin-server-only'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

async function main() {
  const { evaluarAlertas } = await import('../../src/lib/alertas/motor')

  console.log('\n  Corriendo el motor…\n')
  const r = await evaluarAlertas()

  const ancho = Math.max(...r.porRegla.map((p) => p.codigo.length))
  console.log(`  ${'regla'.padEnd(ancho)}  hallazgos  nuevas`)
  console.log('  ' + '─'.repeat(ancho + 20))

  for (const p of [...r.porRegla].sort((a, b) => b.hallazgos - a.hallazgos)) {
    const marca = p.error ? ' ✖ ' + p.error : ''
    console.log(
      `  ${p.codigo.padEnd(ancho)}  ${String(p.hallazgos).padStart(8)}  ${String(p.nuevas).padStart(6)}${marca}`,
    )
  }

  console.log('  ' + '─'.repeat(ancho + 20))
  console.log(`  Nuevas: ${r.nuevas} · Resueltas: ${r.resueltas} · Abiertas: ${r.abiertas} · Críticas: ${r.criticas}`)
  console.log(`  Notificaciones generadas: ${r.notificaciones}`)
  console.log(`  Tardó ${r.duracion} ms\n`)

  if (r.errores.length > 0) {
    console.log('  Errores:')
    for (const e of r.errores) console.log(`    ✖ ${e}`)
    console.log()
  }

  ok(r.errores.length === 0, 'Ninguna regla falló')

  /*
   * ---- Los problemas plantados en el prompt 2 ----
   *
   * Estos números salen del seed. Si alguno bajó, lo más probable es que
   * se haya resuelto el problema desde la app (devolver una herramienta,
   * renovar un documento) mientras se probaba: eso es el motor haciendo
   * su trabajo, no una regresión. Para volver al punto de partida,
   * `npm run db:seed`.
   */
  console.log('  ── Los problemas plantados tienen que estar ──\n')

  const conteo = new Map(r.porRegla.map((p) => [p.codigo, p.hallazgos]))
  const tiene = (codigo: string, minimo = 1) =>
    (conteo.get(codigo) ?? 0) >= minimo

  ok(tiene('HERRAMIENTA_NO_DEVUELTA', 2), `Herramientas sin devolver: ${conteo.get('HERRAMIENTA_NO_DEVUELTA')}`)
  ok(tiene('HERRAMIENTA_EN_OBRA_INACTIVA', 4), `Herramientas en la obra finalizada: ${conteo.get('HERRAMIENTA_EN_OBRA_INACTIVA')}`)
  ok(tiene('MANTENIMIENTO_HERRAMIENTA_VENCIDO', 1), `Mantenimiento vencido: ${conteo.get('MANTENIMIENTO_HERRAMIENTA_VENCIDO')}`)
  ok(tiene('HERRAMIENTA_EN_REPARACION_DEMORADA', 1), `Demoradas en el taller: ${conteo.get('HERRAMIENTA_EN_REPARACION_DEMORADA')}`)
  ok(tiene('DOC_EMPLEADO_POR_VENCER', 2), `Documentación de empleados: ${conteo.get('DOC_EMPLEADO_POR_VENCER')}`)
  ok(tiene('DOC_VEHICULO_POR_VENCER', 2), `Documentación de vehículos: ${conteo.get('DOC_VEHICULO_POR_VENCER')}`)
  ok(tiene('LICENCIA_CHOFER_POR_VENCER', 1), `Licencias por vencer: ${conteo.get('LICENCIA_CHOFER_POR_VENCER')}`)
  ok(tiene('PARTE_DIARIO_FALTANTE', 1), `Partes faltantes: ${conteo.get('PARTE_DIARIO_FALTANTE')}`)
  ok(tiene('PARTE_SIN_APROBAR', 1), `Partes sin aprobar: ${conteo.get('PARTE_SIN_APROBAR')}`)
  ok(tiene('PRESUPUESTO_MANO_OBRA', 2), `Obras con el presupuesto comprometido: ${conteo.get('PRESUPUESTO_MANO_OBRA')}`)
  ok(tiene('SOLICITUD_VIAJE_SIN_ASIGNAR', 1), `Solicitudes de viaje sin asignar: ${conteo.get('SOLICITUD_VIAJE_SIN_ASIGNAR')}`)
  ok(tiene('PEDIDO_SIN_APROBAR', 1), `Pedidos sin aprobar: ${conteo.get('PEDIDO_SIN_APROBAR')}`)
  ok(tiene('MATERIAL_NO_ENTREGADO', 1), `Material que no llegó: ${conteo.get('MATERIAL_NO_ENTREGADO')}`)
  ok(tiene('SERVICE_VEHICULO_PROXIMO', 1), `Service próximo: ${conteo.get('SERVICE_VEHICULO_PROXIMO')}`)

  // ---- La misma corrida dos veces no duplica ----
  console.log('\n  ── El motor no duplica ──\n')
  const antes = await db.alerta.count()
  const r2 = await evaluarAlertas()
  const despues = await db.alerta.count()

  ok(r2.nuevas === 0, `La segunda corrida no creó alertas nuevas (${r2.nuevas})`)
  ok(antes === despues, `La cantidad total no cambió (${antes} → ${despues})`)

  const duplicadas = await db.$queryRaw<Array<{ claveUnica: string; n: bigint }>>`
    SELECT "claveUnica", COUNT(*) as n FROM "Alerta"
    GROUP BY "claveUnica" HAVING COUNT(*) > 1
  `
  ok(duplicadas.length === 0, `No hay claves únicas repetidas (${duplicadas.length})`)

  // ---- Se resuelven solas ----
  console.log('\n  ── Se resuelven solas ──\n')

  // Marca de tiempo para poder deshacer exactamente lo que haga la prueba.
  const desdeLaPrueba = new Date()

  const vencida = await db.herramienta.findFirst({
    where: {
      estado: 'EN_OBRA',
      fechaDevolucionPrevista: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      obraId: true,
      depositoId: true,
      responsableActualId: true,
      fechaDevolucionPrevista: true,
      condicion: true,
    },
  })

  if (vencida) {
    const alertaAntes = await db.alerta.findFirst({
      where: {
        claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}`,
        estado: { in: ['ABIERTA', 'VISTA'] },
      },
    })
    ok(alertaAntes !== null, `${vencida.codigo} tiene su alerta abierta`)

    // Se devuelve la herramienta, como lo haría el pañolero.
    const deposito = await db.deposito.findFirst({ select: { id: true } })
    const usuario = await db.usuario.findFirst({ where: { rol: 'PANOLERO' } })

    await db.$transaction(async (tx) => {
      await tx.movimientoHerramienta.create({
        data: {
          herramientaId: vencida.id,
          tipo: 'DEVOLUCION',
          fecha: new Date(),
          condicion: 'BUENA',
          origenObraId: vencida.obraId,
          destinoDepositoId: deposito!.id,
          registradoPorId: usuario!.id,
        },
      })
      await tx.herramienta.update({
        where: { id: vencida.id },
        data: {
          estado: 'DISPONIBLE',
          obraId: null,
          depositoId: deposito!.id,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
        },
      })
    })

    const r3 = await evaluarAlertas(['herramientas'])

    const alertaDespues = await db.alerta.findFirst({
      where: { claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}` },
      select: { estado: true, resueltaEn: true },
    })

    ok(
      alertaDespues?.estado === 'RESUELTA',
      `Al devolverla, la alerta pasó sola a RESUELTA (${alertaDespues?.estado})`,
    )
    ok(r3.resueltas >= 1, `El motor informó ${r3.resueltas} resuelta(s)`)

    /*
     * Se deja la herramienta como estaba.
     *
     * Sin esto, cada corrida del script devuelve una herramienta más y
     * los problemas plantados en el seed se van apagando solos: a la
     * cuarta corrida, las aserciones de arriba empiezan a fallar sin que
     * nadie haya tocado el código.
     */
    await db.$transaction(async (tx) => {
      await tx.movimientoHerramienta.deleteMany({
        where: {
          herramientaId: vencida.id,
          tipo: 'DEVOLUCION',
          fecha: { gte: desdeLaPrueba },
        },
      })
      await tx.herramienta.update({
        where: { id: vencida.id },
        data: {
          estado: 'EN_OBRA',
          obraId: vencida.obraId,
          depositoId: vencida.depositoId,
          responsableActualId: vencida.responsableActualId,
          fechaDevolucionPrevista: vencida.fechaDevolucionPrevista,
        },
      })
      await tx.alerta.updateMany({
        where: {
          claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}`,
        },
        data: { estado: 'ABIERTA', resueltaEn: null },
      })
    })

    const repuesta = await db.herramienta.findUnique({
      where: { id: vencida.id },
      select: { estado: true, obraId: true },
    })
    ok(
      repuesta?.estado === 'EN_OBRA' && repuesta.obraId === vencida.obraId,
      `${vencida.codigo} quedó como estaba: el script no ensucia el seed`,
    )

    /*
     * Y el problema vuelve a pasar.
     *
     * `claveUnica` es única: si el motor intentara crear otra alerta en
     * vez de reabrir la que ya está, se caería toda la regla con un
     * error de clave repetida. Pasó de verdad.
     */
    await db.alerta.updateMany({
      where: { claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}` },
      data: { estado: 'RESUELTA', resueltaEn: new Date() },
    })

    const r4 = await evaluarAlertas(['herramientas'])
    ok(r4.errores.length === 0, 'Un problema que vuelve no rompe la regla')

    const reabierta = await db.alerta.findUnique({
      where: { claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}` },
      select: { estado: true, resueltaEn: true },
    })
    ok(
      reabierta?.estado === 'ABIERTA' && reabierta.resueltaEn === null,
      `La alerta se reabrió sola en vez de duplicarse (${reabierta?.estado})`,
    )

    const repetidas = await db.alerta.count({
      where: { claveUnica: `HERRAMIENTA_NO_DEVUELTA:Herramienta:${vencida.id}` },
    })
    ok(repetidas === 1, `Sigue habiendo una sola fila para esa clave (${repetidas})`)
  }

  // ---- Notificaciones ----
  console.log('\n  ── Notificaciones ──\n')
  const porCanal = await db.notificacionEnvio.groupBy({
    by: ['canal', 'estado'],
    _count: true,
  })
  for (const g of porCanal) {
    console.log(`    ${g.canal.padEnd(10)} ${g.estado.padEnd(10)} ${g._count}`)
  }

  const { procesarPendientes, armarResumenDiario } = await import(
    '../../src/lib/alertas/notificaciones'
  )

  const envios = await procesarPendientes()
  console.log(`    procesadas: ${envios.enviados} enviadas, ${envios.fallados} fallidas, ${envios.pendientes} pendientes`)

  const appPendientes = await db.notificacionEnvio.count({
    where: { canal: 'APP', estado: 'PENDIENTE' },
  })
  ok(appPendientes === 0, `El canal de la app no se encola (${appPendientes} pendientes)`)

  const emailPendientes = await db.notificacionEnvio.count({
    where: { canal: 'EMAIL', estado: 'PENDIENTE' },
  })
  ok(emailPendientes > 0, `Email queda pendiente hasta conectar el proveedor (${emailPendientes})`)

  const resumen = await armarResumenDiario()
  ok(resumen.length > 0, `Resumen diario armado para ${resumen.length} usuarios`)
  for (const u of resumen.slice(0, 4)) {
    console.log(`    ${u.nombre.padEnd(20)} ${u.criticas} críticas, ${u.avisos} avisos`)
  }
  console.log()
}

main()
  .catch((e) => { console.error('\n✖', e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
