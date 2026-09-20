/**
 * Las reglas del alta de personal, cuadrillas y vehículos, contra las
 * mismas funciones que usan las Server Actions, y contra la base real
 * para lo que depende de los datos.
 */
import './sin-server-only'
import { CategoriaLaboral } from '@prisma/client'
import { numeroDeTexto } from '../../src/lib/formato'
import {
  categoriaDeTexto,
  conflictosDeCuadrilla,
  cuilValido,
  fechaDeTexto,
} from '../../src/server/personal/reglas'
import {
  kilometrajeValido,
  normalizarPatente,
  patenteValida,
} from '../../src/server/vehiculos/reglas'
import { db } from '../../src/lib/db'
import {
  empleadosParaCuadrilla,
  siguienteLegajo,
} from '../../src/server/personal/queries'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

async function main() {
  console.log('\n  ── CUIL ──\n')
  ok(cuilValido('20301234563'), 'Un CUIL con el verificador correcto pasa')
  ok(!cuilValido('20301234564'), 'Con el verificador cambiado no pasa')
  ok(!cuilValido('2030123456'), 'Con diez dígitos no pasa')
  ok(cuilValido('20-30123456-3'), 'Los guiones no molestan')

  console.log('\n  ── Lectura del CSV ──\n')
  ok(
    categoriaDeTexto('Medio Oficial') === CategoriaLaboral.MEDIO_OFICIAL,
    '"Medio Oficial" se entiende',
  )
  ok(
    categoriaDeTexto('peón') === CategoriaLaboral.AYUDANTE,
    '"peón" es ayudante',
  )
  ok(categoriaDeTexto('gerente') === null, 'Una categoría inventada se rechaza')

  ok(numeroDeTexto('4.500') === 4500, '"4.500" son cuatro mil quinientos')
  ok(numeroDeTexto('4.500,50') === 4500.5, '"4.500,50" lleva los centavos')
  ok(numeroDeTexto('4.5') === 4.5, '"4.5" sigue siendo cuatro y medio')
  ok(numeroDeTexto('$ 1.200.000') === 1_200_000, 'El signo pesos no molesta')
  ok(numeroDeTexto('a convenir') === null, 'Lo que no es número se rechaza')

  const f = fechaDeTexto('14/09/2026')
  ok(
    f?.getDate() === 14 && f?.getMonth() === 8,
    '"14/09/2026" es el 14 de septiembre, no el 9 de febrero',
  )
  ok(fechaDeTexto('2026-09-14')?.getDate() === 14, 'El formato ISO también')
  ok(fechaDeTexto('el lunes') === null, 'Una fecha que no se entiende se rechaza')

  console.log('\n  ── Patentes y odómetro ──\n')
  ok(patenteValida('ABC123'), 'El formato viejo pasa')
  ok(patenteValida('AB123CD'), 'El del Mercosur pasa')
  ok(normalizarPatente('ab-123-cd') === 'AB123CD', 'Los guiones se limpian')
  ok(!patenteValida('ABC12'), 'Una patente corta se rechaza')
  ok(kilometrajeValido(180_000, 175_000).ok, 'El odómetro sube')
  ok(!kilometrajeValido(170_000, 175_000).ok, 'El odómetro no baja')

  console.log('\n  ── Contra la base ──\n')

  const legajo = await siguienteLegajo()
  const usado = await db.empleado.findUnique({ where: { legajo } })
  ok(usado === null, `El legajo sugerido (${legajo}) está libre`)

  const empleados = await empleadosParaCuadrilla()
  ok(empleados.length > 0, `Hay ${empleados.length} empleados para armar cuadrillas`)

  // Nadie puede estar en dos cuadrillas activas: si el seed o una carga
  // rompieron eso, lo tenemos que ver acá y no cuando falle un guardado.
  const enVarias = empleados.filter((e) => e.cuadrillas.length > 1)
  ok(
    enVarias.length === 0,
    enVarias.length === 0
      ? 'Nadie está en dos cuadrillas activas'
      : `${enVarias.length} personas están en más de una cuadrilla`,
  )

  const ocupado = empleados.find((e) => e.cuadrillas.length === 1)
  if (ocupado) {
    const conflictos = conflictosDeCuadrilla(
      empleados.map((e) => ({
        empleadoId: e.id,
        nombre: `${e.apellido}, ${e.nombre}`,
        cuadrillaActiva: e.cuadrillas[0]?.cuadrilla.nombre ?? null,
      })),
      [ocupado.id],
    )
    ok(
      conflictos.length === 1,
      `Sumar a ${ocupado.apellido} a otra cuadrilla se bloquea y dice de cuál viene`,
    )
  }

  const libre = empleados.find((e) => e.cuadrillas.length === 0)
  if (libre) {
    const conflictos = conflictosDeCuadrilla(
      empleados.map((e) => ({
        empleadoId: e.id,
        nombre: `${e.apellido}, ${e.nombre}`,
        cuadrillaActiva: e.cuadrillas[0]?.cuadrilla.nombre ?? null,
      })),
      [libre.id],
    )
    ok(conflictos.length === 0, 'Alguien sin cuadrilla se puede sumar')
  }

  // Todo empleado tiene que tener abierto su historial de valor hora: es
  // contra lo que se compara cualquier cambio posterior.
  const sinHistorial = await db.empleado.count({
    where: { activo: true, historialValorHora: { none: {} } },
  })
  ok(
    sinHistorial === 0,
    sinHistorial === 0
      ? 'Todos los empleados activos tienen historial de valor hora'
      : `${sinHistorial} empleados activos no tienen historial`,
  )

  const patentesMalas = (
    await db.vehiculo.findMany({ select: { patente: true } })
  ).filter((v) => !patenteValida(v.patente))
  ok(
    patentesMalas.length === 0,
    patentesMalas.length === 0
      ? 'Todas las patentes cargadas tienen formato válido'
      : `Patentes con formato raro: ${patentesMalas.map((v) => v.patente).join(', ')}`,
  )

  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
