/**
 * Auditoría de seguridad: revisa que toda pantalla y toda Server Action
 * verifiquen sesión y permiso en el SERVIDOR, no solo ocultando botones.
 *
 * Es una revisión estática del código: busca los archivos que deberían
 * tener el guardia y avisa de los que no lo tienen.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = new URL('../../src', import.meta.url).pathname
const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

function archivos(dir: string, extension = '.ts'): string[] {
  const salida: string[] = []
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) {
      salida.push(...archivos(ruta, extension))
    } else if (ruta.endsWith(extension) || ruta.endsWith('.tsx')) {
      salida.push(ruta)
    }
  }
  return salida
}

const todos = archivos(RAIZ)
const corto = (r: string) => relative(RAIZ, r)

console.log('\n  ── Pantallas protegidas ──\n')

// Las páginas dentro de (app) tienen que exigir sesión.
const paginas = todos.filter(
  (r) => r.includes('/app/(app)/') && r.endsWith('page.tsx'),
)

const sinGuardia: string[] = []
for (const ruta of paginas) {
  const contenido = readFileSync(ruta, 'utf8')
  const tiene =
    contenido.includes('sesionConPermiso') ||
    contenido.includes('exigirSesion') ||
    contenido.includes('obtenerSesion')
  if (!tiene) sinGuardia.push(corto(ruta))
}

ok(
  sinGuardia.length === 0,
  `${paginas.length} pantallas revisadas${sinGuardia.length > 0 ? `, sin guardia: ${sinGuardia.join(', ')}` : ', todas verifican sesión'}`,
)

console.log('\n  ── Server Actions protegidas ──\n')

const conUseServer = todos.filter((r) => {
  const c = readFileSync(r, 'utf8')
  return c.startsWith("'use server'") || c.startsWith('"use server"')
})

/*
 * Dos archivos no pueden exigir una sesión previa, por definición:
 * el login (todavía no hay sesión) y el cierre de sesión (la está
 * borrando). Son las únicas excepciones válidas.
 */
const EXCEPCIONES = [
  'app/(auth)/login/acciones.ts',
  'app/(app)/acciones-sesion.ts',
]

const accionesSinPermiso: string[] = []
for (const ruta of conUseServer) {
  if (EXCEPCIONES.includes(corto(ruta))) continue
  const contenido = readFileSync(ruta, 'utf8')
  if (!contenido.includes('exigirSesion')) {
    accionesSinPermiso.push(corto(ruta))
  }
}

ok(
  accionesSinPermiso.length === 0,
  `${conUseServer.length - EXCEPCIONES.length} archivos de Server Actions exigen sesión${accionesSinPermiso.length > 0 ? `, sin guardia: ${accionesSinPermiso.join(', ')}` : ''}`,
)
console.log(
  `    (${EXCEPCIONES.length} excepciones válidas: el login y el cierre de sesión)`,
)

// Y casi todos tienen que chequear un permiso concreto, no solo sesión.
const soloSesion = conUseServer.filter((r) => {
  const c = readFileSync(r, 'utf8')
  return c.includes('exigirSesion') && !c.includes('exigirPermiso')
})
console.log(
  `    ${conUseServer.length - soloSesion.length} de ${conUseServer.length} además verifican un permiso concreto`,
)
if (soloSesion.length > 0) {
  console.log(`    solo sesión: ${soloSesion.map(corto).join(', ')}`)
}

console.log('\n  ── Rutas de API protegidas ──\n')

const rutasApi = todos.filter((r) => r.includes('/app/api/') && r.endsWith('route.ts'))
const apiSinGuardia: string[] = []

for (const ruta of rutasApi) {
  const contenido = readFileSync(ruta, 'utf8')
  const tiene =
    contenido.includes('obtenerSesion') ||
    contenido.includes('exigirSesion') ||
    contenido.includes('CRON_SECRET')
  if (!tiene) apiSinGuardia.push(corto(ruta))
}

ok(
  apiSinGuardia.length === 0,
  `${rutasApi.length} rutas de API${apiSinGuardia.length > 0 ? `, sin guardia: ${apiSinGuardia.join(', ')}` : ', todas autenticadas'}`,
)

console.log('\n  ── Alcance por obra ──\n')

// Las queries que devuelven datos de obras tienen que filtrar por las
// obras de la sesión.
const queriesDeObra = todos.filter(
  (r) => r.includes('/server/') && r.endsWith('queries.ts'),
)

const conFiltro = queriesDeObra.filter((r) => {
  const c = readFileSync(r, 'utf8')
  return c.includes('obrasDeLaSesion') || c.includes('filtroObras') || c.includes('filtroPorObraId')
})

console.log(
  `    ${conFiltro.length} de ${queriesDeObra.length} módulos de consulta filtran por las obras de la sesión`,
)
/*
 * Dos módulos no filtran por obra y está bien:
 *  · herramientas: el módulo existe para contestar "¿tenemos esto y
 *    dónde está?". Ocultar las herramientas de otras obras haría que un
 *    capataz pida comprar algo que la empresa ya tiene.
 *  · tablero: solo lo ven el dueño y administración, que ven todo.
 */
const SIN_FILTRO_A_PROPOSITO: Record<string, string> = {
  'server/herramientas/queries.ts':
    'a propósito: el pañol tiene que ver todo el inventario',
  'server/tablero/queries.ts': 'a propósito: solo lo ve quien ve todo',
  'server/nucleo/accesos-queries.ts':
    'a propósito: lista usuarios, no datos de obra, y solo entra el dueño',
}

let inesperados = 0
for (const r of queriesDeObra) {
  const nombre = corto(r)
  const filtra = conFiltro.includes(r)
  const explicado = SIN_FILTRO_A_PROPOSITO[nombre]

  if (!filtra && !explicado) inesperados += 1

  console.log(
    `    ${filtra ? '✔' : explicado ? '·' : '✖'} ${nombre}${
      filtra ? '' : `  (${explicado ?? 'SIN EXPLICAR: revisar'})`
    }`,
  )
}
ok(inesperados === 0, 'Todo módulo que no filtra por obra tiene su motivo')

console.log('\n  ── Cabeceras de seguridad ──\n')

const config = readFileSync(
  new URL('../../next.config.ts', import.meta.url).pathname,
  'utf8',
)
for (const cabecera of [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Strict-Transport-Security',
]) {
  ok(config.includes(cabecera), cabecera)
}

console.log('\n  ── Secretos ──\n')

const conSecretos = todos.filter((r) => {
  const c = readFileSync(r, 'utf8')
  // Un secreto hardcodeado se vería como una cadena larga asignada.
  return /AUTH_SECRET\s*=\s*['"][^'"]{10,}/.test(c) ||
         /CRON_SECRET\s*=\s*['"][^'"]{10,}/.test(c)
})
ok(conSecretos.length === 0, 'Ningún secreto hardcodeado en el código')

const envEnGit = readFileSync(
  new URL('../../.gitignore', import.meta.url).pathname,
  'utf8',
)
ok(envEnGit.includes('.env*'), '.env está en .gitignore')
console.log()
