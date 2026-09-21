/**
 * Los accesos por persona: que abrir y cerrar un módulo tenga efecto de
 * verdad, y que nadie pueda dejarse afuera.
 */
import './sin-server-only'
import { Rol } from '@prisma/client'
import {
  MODULOS,
  modulosQueVe,
  puede,
  rolVeModulo,
} from '../../src/server/../lib/auth/permisos'
import { db } from '../../src/lib/db'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

const sesion = (rol: Rol, accesos: Record<string, boolean> = {}) =>
  ({ rol, accesos }) as Parameters<typeof puede>[0]

async function main() {
  console.log('\n  ── Sin excepciones manda el rol ──\n')

  ok(
    puede(sesion(Rol.CAPATAZ), 'herramientas.ver'),
    'El capataz ve herramientas, como siempre',
  )
  ok(
    !puede(sesion(Rol.CAPATAZ), 'tablero.ver'),
    'El capataz no ve el tablero',
  )
  ok(
    !puede(sesion(Rol.CHOFER), 'personal.ver'),
    'El chofer no ve personal',
  )

  console.log('\n  ── Cerrar un módulo a mano ──\n')

  const capatazSinHerramientas = sesion(Rol.CAPATAZ, { herramientas: false })
  ok(
    !puede(capatazSinHerramientas, 'herramientas.ver'),
    'Cerrado: deja de ver herramientas aunque el rol se las daba',
  )
  ok(
    !puede(capatazSinHerramientas, 'herramientas.crear'),
    'Cerrado: tampoco puede crear. El módulo queda cerrado entero',
  )
  ok(
    puede(capatazSinHerramientas, 'personal.ver'),
    'Cerrar uno no toca los demás módulos',
  )

  console.log('\n  ── Abrir un módulo a mano ──\n')

  const capatazConTablero = sesion(Rol.CAPATAZ, { tablero: true })
  ok(
    puede(capatazConTablero, 'tablero.ver'),
    'Abierto: ve el tablero aunque el rol no se lo daba',
  )
  ok(
    !puede(capatazConTablero, 'tablero.configurar'),
    'Abrir da VER, no da configurar: lo de adentro lo decide el rol',
  )

  const choferConPersonal = sesion(Rol.CHOFER, { personal: true })
  ok(
    puede(choferConPersonal, 'personal.ver'),
    'Al chofer se le puede abrir personal',
  )
  ok(
    !puede(choferConPersonal, 'personal.editar'),
    'Pero no lo convierte en RRHH',
  )

  console.log('\n  ── Abrir no es lo mismo que ascender ──\n')

  /*
   * Lo importante de todo esto: que abrir un módulo no sea una puerta
   * trasera para conseguir permisos de escritura que el rol no da.
   */
  const acciones = ['crear', 'editar', 'aprobar', 'configurar'] as const
  const filtrados = MODULOS.flatMap((m) =>
    acciones
      .filter(
        (a) =>
          puede(sesion(Rol.CHOFER, { [m]: true }), `${m}.${a}`) &&
          !puede(sesion(Rol.CHOFER), `${m}.${a}`),
      )
      .map((a) => `${m}.${a}`),
  )
  ok(
    filtrados.length === 0,
    filtrados.length === 0
      ? 'Abrir un módulo no da ningún permiso de escritura nuevo'
      : `Abrir un módulo dio de más: ${filtrados.join(', ')}`,
  )

  console.log('\n  ── Lo que dibuja la pantalla ──\n')

  const vistaCapataz = modulosQueVe(Rol.CAPATAZ, { tablero: true, vehiculos: false })
  ok(vistaCapataz.tablero === true, 'La casilla del tablero sale marcada')
  ok(vistaCapataz.vehiculos === false, 'La de vehículos sale desmarcada')
  ok(
    vistaCapataz.herramientas === rolVeModulo(Rol.CAPATAZ, 'herramientas'),
    'Las que no se tocaron siguen lo que da el rol',
  )

  console.log('\n  ── Contra la base ──\n')

  const dueno = await db.usuario.findFirst({
    where: { rol: Rol.DUENO },
    select: { id: true, nombre: true },
  })
  ok(dueno !== null, 'Hay un dueño en la base')

  const huerfanos = await db.accesoUsuario.findMany({
    where: { modulo: { notIn: [...MODULOS] } },
    select: { modulo: true },
  })
  ok(
    huerfanos.length === 0,
    huerfanos.length === 0
      ? 'No hay accesos guardados de módulos que no existen'
      : `Módulos desconocidos guardados: ${huerfanos.map((h) => h.modulo).join(', ')}`,
  )

  /* ------------------------------------------------------------------
     La parte que necesita el server andando. Si no está, se saltea.
     ------------------------------------------------------------------ */

  const BASE = process.env.BASE ?? 'http://localhost:3000'
  const vivo = await fetch(`${BASE}/login`)
    .then((r) => r.ok)
    .catch(() => false)

  if (!vivo) {
    console.log(`\n  (server apagado en ${BASE}: se saltea la prueba de sesión)\n`)
    await db.$disconnect()
    return
  }

  console.log('\n  ── La sesión se revisa contra la base ──\n')

  const { firmarSesion } = await import('../../src/lib/auth/token')
  const entra = async (cookie: string) =>
    (await fetch(`${BASE}/inicio`, { headers: { cookie }, redirect: 'manual' }))
      .status === 200

  const panolero = await db.usuario.findFirst({
    where: { rol: Rol.PANOLERO },
    select: { id: true, nombre: true, email: true, activo: true },
  })

  if (panolero) {
    const cookie = `signa_sesion=${await firmarSesion({
      usuarioId: panolero.id,
      nombre: panolero.nombre,
      email: panolero.email,
      rol: Rol.PANOLERO,
      empleadoId: null,
    })}`

    ok(await entra(cookie), 'Con el usuario activo, la sesión entra')

    await db.usuario.update({ where: { id: panolero.id }, data: { activo: false } })
    ok(
      !(await entra(cookie)),
      'Desactivado: la MISMA cookie deja de servir al instante, sin esperar los 7 días',
    )

    // Se deja como estaba.
    await db.usuario.update({
      where: { id: panolero.id },
      data: { activo: panolero.activo },
    })
    ok(await entra(cookie), 'Reactivado: vuelve a entrar sin loguearse de nuevo')
  }

  const fantasma = `signa_sesion=${await firmarSesion({
    usuarioId: 'cmusuarioquenoexiste0000',
    nombre: 'X',
    email: 'x@x.com',
    rol: Rol.DUENO,
    empleadoId: null,
  })}`
  ok(
    !(await entra(fantasma)),
    'Una cookie firmada de un usuario borrado no entra, aunque diga DUENO',
  )

  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
