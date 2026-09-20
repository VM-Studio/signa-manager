/* =====================================================================
   SIGNA · datos de demostración

   Es idempotente: limpia todo y vuelve a cargar. Se puede correr las
   veces que haga falta, y siempre queda igual, porque el azar tiene
   semilla fija y las fechas son relativas a hoy.

       npm run db:seed      carga los datos
       npm run db:reset     reinicia la base y vuelve a cargar

   Los datos imitan a una constructora real de zona norte del Gran
   Buenos Aires, con problemas plantados a propósito para que la demo
   muestre para qué sirve el sistema.
   ===================================================================== */

import { PrismaClient } from '@prisma/client'
import { sembrarNucleo, CLAVE_DEMO } from './seed/nucleo'
import { sembrarPersonal, sembrarQuincenas } from './seed/personal'
import { sembrarHerramientas } from './seed/herramientas'
import { sembrarVehiculos } from './seed/vehiculos'
import { sembrarSistemaBase } from './seed/sistema-base'
import { sembrarReglasAlerta } from './seed/alertas'

const db = new PrismaClient()

/**
 * Borra todo en orden inverso al de las dependencias.
 * TRUNCATE ... CASCADE en una sola sentencia es mucho más rápido que
 * borrar tabla por tabla y no se pelea con las claves foráneas.
 */
async function limpiar(): Promise<void> {
  console.log('\n▸ Limpiando la base')

  const tablas = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `

  if (tablas.length === 0) return

  const lista = tablas.map((t) => `"public"."${t.tablename}"`).join(', ')
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`)
  console.log(`  ${tablas.length} tablas vaciadas`)
}

/** Cuántos registros quedaron en cada tabla, para revisar de un vistazo. */
async function resumen(): Promise<void> {
  const conteos: Array<[string, number]> = [
    ['UnidadNegocio', await db.unidadNegocio.count()],
    ['Usuario', await db.usuario.count()],
    ['Deposito', await db.deposito.count()],
    ['Obra', await db.obra.count()],
    ['CategoriaHerramienta', await db.categoriaHerramienta.count()],
    ['Herramienta', await db.herramienta.count()],
    ['ExistenciaHerramienta', await db.existenciaHerramienta.count()],
    ['MovimientoHerramienta', await db.movimientoHerramienta.count()],
    ['MantenimientoHerramienta', await db.mantenimientoHerramienta.count()],
    ['SolicitudHerramienta', await db.solicitudHerramienta.count()],
    ['Empleado', await db.empleado.count()],
    ['HistorialValorHora', await db.historialValorHora.count()],
    ['DocumentoEmpleado', await db.documentoEmpleado.count()],
    ['EntregaEpp', await db.entregaEpp.count()],
    ['Subcontratista', await db.subcontratista.count()],
    ['DocumentoSubcontratista', await db.documentoSubcontratista.count()],
    ['Cuadrilla', await db.cuadrilla.count()],
    ['CuadrillaMiembro', await db.cuadrillaMiembro.count()],
    ['AsignacionObra', await db.asignacionObra.count()],
    ['ParteDiario', await db.parteDiario.count()],
    ['ParteDiarioLinea', await db.parteDiarioLinea.count()],
    ['ParteSubcontratista', await db.parteSubcontratista.count()],
    ['NovedadPersonal', await db.novedadPersonal.count()],
    ['Quincena', await db.quincena.count()],
    ['QuincenaLinea', await db.quincenaLinea.count()],
    ['PagoPersonal', await db.pagoPersonal.count()],
    ['Vehiculo', await db.vehiculo.count()],
    ['DocumentoVehiculo', await db.documentoVehiculo.count()],
    ['SolicitudViaje', await db.solicitudViaje.count()],
    ['Viaje', await db.viaje.count()],
    ['CargaCombustible', await db.cargaCombustible.count()],
    ['MantenimientoVehiculo', await db.mantenimientoVehiculo.count()],
    ['IncidenteVehiculo', await db.incidenteVehiculo.count()],
    ['MovimientoExterno', await db.movimientoExterno.count()],
    ['PedidoCompraExterno', await db.pedidoCompraExterno.count()],
    ['RegistroSync', await db.registroSync.count()],
    ['ReglaAlerta', await db.reglaAlerta.count()],
    ['Alerta', await db.alerta.count()],
  ]

  const ancho = Math.max(...conteos.map(([n]) => n.length))
  const total = conteos.reduce((a, [, c]) => a + c, 0)

  console.log('\n┌─────────────────────────────────────────────┐')
  console.log('│  Registros por tabla                        │')
  console.log('└─────────────────────────────────────────────┘')
  for (const [nombre, cantidad] of conteos) {
    const puntos = '.'.repeat(ancho - nombre.length + 4)
    console.log(`  ${nombre} ${puntos} ${String(cantidad).padStart(6)}`)
  }
  console.log(`  ${'─'.repeat(ancho + 12)}`)
  console.log(`  TOTAL ${'.'.repeat(ancho - 1)} ${String(total).padStart(6)}\n`)
}

async function main(): Promise<void> {
  const arranque = Date.now()

  console.log('\n═══════════════════════════════════════════════')
  console.log('  SIGNA · datos de demostración')
  console.log('═══════════════════════════════════════════════')

  await limpiar()

  const nucleo = await sembrarNucleo(db)
  const personal = await sembrarPersonal(db, nucleo)
  await sembrarHerramientas(db, nucleo, personal)
  await sembrarVehiculos(db, nucleo, personal)
  await sembrarQuincenas(db, nucleo, personal)
  await sembrarSistemaBase(db, nucleo)
  await sembrarReglasAlerta(db)

  await resumen()

  console.log('▸ Problemas plantados a propósito')
  console.log('  · 2 herramientas con devolución vencida hace 9 días')
  console.log('  · 4 herramientas en la obra finalizada')
  console.log('  · 1 hormigonera con mantenimiento vencido')
  console.log('  · 1 camión con la VTV a 5 días y 1 camioneta con el seguro vencido ayer')
  console.log('  · 1 chofer con la licencia por vencer en 10 días')
  console.log('  · 2 empleados con documentación vencida')
  console.log('  · 1 obra en curso sin parte diario de ayer')
  console.log('  · 1 pedido de compra sin aprobar hace 6 días')
  console.log('  · 1 pedido aprobado cuyo material debía estar en obra hace 3 días')
  console.log('  · 1 obra al 92% del presupuesto de mano de obra y otra excedida')
  console.log('  · 1 solicitud de viaje urgente sin asignar')

  console.log(`\n▸ Entrar con cualquier usuario @signa.demo · contraseña ${CLAVE_DEMO}`)
  console.log(`▸ Listo en ${((Date.now() - arranque) / 1000).toFixed(1)}s\n`)
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (error) => {
    console.error('\n✖ El seed falló:\n', error)
    await db.$disconnect()
    process.exit(1)
  })
