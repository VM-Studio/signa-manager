/**
 * Entra con cada usuario de demostración y pide las pantallas
 * principales. Confirma dos cosas:
 *   · que ninguna pantalla rompe con ningún rol
 *   · que cada rol ve exactamente lo que le corresponde
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = process.env.BASE ?? 'http://localhost:3001'

const RUTAS: Array<[string, string]> = [
  ['/inicio', 'inicio'],
  ['/mas', 'más'],
  ['/herramientas', 'herr'],
  ['/personal', 'pers'],
  ['/vehiculos', 'vehí'],
  ['/obras', 'obras'],
  ['/alertas', 'alert'],
  ['/tablero', 'tabl'],
  ['/mas/usuarios', 'usuar'],
  ['/mas/unidades', 'unid'],
  ['/mas/mi-cuenta', 'cuenta'],
]

const MARCA_SIN_PERMISO = 'No podés entrar acá'
const MARCA_ERROR = 'Algo salió mal'

async function main() {
  const usuarios = await db.usuario.findMany({
    where: { email: { endsWith: '@signa.demo' } },
    select: { id: true, nombre: true, email: true, rol: true, empleadoId: true },
    orderBy: [{ rol: 'asc' }, { email: 'asc' }],
  })

  const { firmarSesion } = await import('../../src/lib/auth/token')

  const anchos = RUTAS.map(([, corto]) => Math.max(corto.length, 3) + 2)
  const cabecera = RUTAS.map(([, corto], i) => corto.padEnd(anchos[i])).join('')
  console.log(`\n  ${'rol'.padEnd(17)}${cabecera}`)
  console.log('  ' + '─'.repeat(17 + anchos.reduce((a, b) => a + b, 0)))

  let errores = 0

  for (const u of usuarios) {
    const token = await firmarSesion({
      usuarioId: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      empleadoId: u.empleadoId,
    })

    const celdas: string[] = []
    for (const [i, [ruta]] of RUTAS.entries()) {
      const res = await fetch(`${BASE}${ruta}`, {
        headers: { cookie: `signa_sesion=${token}` },
        redirect: 'manual',
      })
      const html = await res.text()

      let marca: string
      if (res.status !== 200) marca = String(res.status)
      else if (html.includes(MARCA_ERROR)) { marca = 'ERROR'; errores += 1 }
      else if (html.includes(MARCA_SIN_PERMISO)) marca = '·'
      else marca = 've'

      celdas.push(marca.padEnd(anchos[i]))
    }

    console.log(`  ${u.rol.padEnd(17)}${celdas.join('')}`)
  }

  console.log('\n  ve = la ve · · = sin permiso · ERROR = la pantalla rompió')
  console.log(errores === 0 ? '  ✔ Ninguna pantalla rompió\n' : `  ✖ ${errores} pantallas rotas\n`)
}

main().finally(() => db.$disconnect())
