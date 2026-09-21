#!/usr/bin/env node
/**
 * El build de producción, paso por paso y con errores que se entienden.
 *
 * Antes esto era una sola línea en vercel.json:
 *
 *   prisma generate && prisma migrate deploy && next build
 *
 * El problema es que cuando falla, Prisma tira un error que no dice qué
 * hacer ("Environment variable not found: DATABASE_URL" en medio de
 * cincuenta líneas de log) y hay que adivinar. Acá cada paso revisa lo
 * suyo antes de correr y dice exactamente qué falta y dónde cargarlo.
 */
import { execFileSync } from 'node:child_process'

const ROJO = '[31m'
const GRIS = '[90m'
const FIN = '[0m'

function morir(titulo, detalle) {
  console.error(`\n${ROJO}x ${titulo}${FIN}\n`)
  console.error(detalle.trim() + '\n')
  process.exit(1)
}

function paso(nombre, comando, argumentos, entorno = {}) {
  console.log(`\n${GRIS}> ${nombre}${FIN}`)
  execFileSync(comando, argumentos, {
    stdio: 'inherit',
    env: { ...process.env, ...entorno },
  })
}

/* ------------------------- 1. Lo que hace falta ----------------------- */

/**
 * Una variable vacía es lo mismo que una variable que no está.
 *
 * Importa: en Vercel es facilísimo dejar una cargada con el valor vacío,
 * y `??` no la considera ausente. Todo el script usa esto en vez de
 * leer process.env directo.
 */
const leer = (nombre) => {
  const v = process.env[nombre]
  return v && v.trim() !== '' ? v.trim() : undefined
}

const FALTANTES = ['DATABASE_URL', 'AUTH_SECRET'].filter((v) => !leer(v))

if (FALTANTES.length > 0) {
  morir(
    `Faltan variables de entorno: ${FALTANTES.join(', ')}`,
    `
Cargalas en Vercel, en Settings > Environment Variables, para los tres
entornos (Production, Preview y Development), y volvé a desplegar.

  DATABASE_URL   La conexión a PostgreSQL.
                 En Neon o Supabase es la que dice "Connection string".

  AUTH_SECRET    El secreto que firma la sesión. Generalo con:
                 openssl rand -base64 48

Si la base es Neon o Supabase, la conexión que te dan viene por el
pooler y las migraciones no corren por ahí. En ese caso cargá también:

  DIRECT_URL     La conexión directa, sin "-pooler" en el host.
                 Este script la usa solo para migrar.
`,
  )
}

/* --------------------- 2. Que la URL sea de verdad -------------------- */

/*
 * No alcanza con que la variable exista: lo que más pasa es cargar en
 * Vercel la URL local, sea copiándola del .env de la máquina o pegando
 * el ejemplo de .env.example. El build entonces sale a buscar una base
 * en localhost, que en Vercel no existe, y Prisma contesta
 * "Can't reach database server at localhost:5432", que no da ninguna
 * pista de que el problema es la variable.
 */
const LOCALES = ['localhost', '127.0.0.1', '0.0.0.0', '::1']

function revisarUrl(nombre, valor) {
  let host
  try {
    host = new URL(valor).hostname
  } catch {
    morir(
      `${nombre} no es una URL válida`,
      `
Tiene que tener esta forma:

  postgresql://usuario:contraseña@host:5432/base?sslmode=require

Si la contraseña tiene símbolos, van codificados: @ es %40, # es %23,
/ es %2F, : es %3A.
`,
    )
  }

  if (LOCALES.includes(host)) {
    /*
     * Solo es un error EN Vercel. Correr este mismo script en tu máquina
     * contra la base local es perfectamente razonable —sirve para probar
     * que el build de producción pasa— así que ahí solo se avisa.
     * VERCEL=1 lo pone la plataforma sola.
     */
    if (!leer('VERCEL')) {
      console.log(
        `${GRIS}  (${nombre} apunta a ${host}: bien para local, no serviría en Vercel)${FIN}`,
      )
      return
    }

    morir(
      `${nombre} apunta a ${host}: esa es tu base local`,
      `
Vercel corre el build en sus servidores, donde no hay ningún PostgreSQL
en ${host}. Hay que cargar la URL de la base de producción.

Lo que suele pasar es que se copió el valor del .env de tu máquina, o el
de ejemplo de .env.example. Ese archivo es una plantilla: los valores de
adentro no sirven en producción.

Dónde conseguir la buena:

  Neon       Dashboard > Connection string
  Supabase   Project Settings > Database > Connection string
  Railway    El servicio Postgres > Variables > DATABASE_URL

Después cargala en Vercel, en Settings > Environment Variables, para
Production, Preview y Development, y volvé a desplegar.
`,
    )
  }
}

revisarUrl('DATABASE_URL', leer('DATABASE_URL'))
for (const n of ['DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING']) {
  if (leer(n)) revisarUrl(n, leer(n))
}

/* --------------------------- 3. El cliente ---------------------------- */

paso('Generando el cliente de Prisma', 'npx', ['prisma', 'generate'])

/* ------------------------- 4. Las migraciones ------------------------- */

/*
 * Neon y Supabase entregan una conexión por pooler (pgbouncer). Sirve
 * para consultar, pero no para migrar: las migraciones toman un lock y
 * usan sentencias preparadas, que el pooler no sostiene. Si está
 * DIRECT_URL, se migra por ahí y la app sigue usando el pooler.
 *
 * Se usa `leer` y no process.env directo porque una variable cargada
 * pero vacía tiene que comportarse como si no estuviera: con `??` la
 * cadena vacía gana y se migraría contra nada.
 *
 * Los nombres cambian según de dónde venga la base:
 *
 *   DIRECT_URL                  si la cargaste a mano
 *   DATABASE_URL_UNPOOLED       la integración Neon de Vercel
 *   POSTGRES_URL_NON_POOLING    el Vercel Postgres viejo
 *
 * Se prueban en ese orden para que crear la base desde Vercel funcione
 * sin cargar nada a mano.
 */
const DIRECTAS = ['DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING']
const nombreDirecta = DIRECTAS.find((n) => leer(n))
const urlParaMigrar = nombreDirecta ? leer(nombreDirecta) : leer('DATABASE_URL')

if (nombreDirecta) {
  console.log(`${GRIS}  (migrando por ${nombreDirecta}, no por el pooler)${FIN}`)
}

try {
  paso('Aplicando migraciones', 'npx', ['prisma', 'migrate', 'deploy'], {
    DATABASE_URL: urlParaMigrar,
  })
} catch {
  morir(
    'No se pudieron aplicar las migraciones',
    `
Las causas habituales, en orden:

1. La base todavía no existe o no acepta conexiones desde Vercel.
   Revisá que el proveedor permita conexiones externas.

2. DATABASE_URL apunta al pooler. Cargá DIRECT_URL con la conexión
   directa (la misma sin "-pooler" en el host) y volvé a desplegar.

3. La contraseña de la URL tiene caracteres raros sin escapar.
   Los símbolos van codificados: @ es %40, # es %23, / es %2F.

La app no se despliega con la base a medio migrar: es preferible que
falle acá y no que ande a medias en producción.
`,
  )
}

/* ---------------------------- 5. El build ----------------------------- */

paso('Compilando la app', 'npx', ['next', 'build'])

console.log('\nListo.\n')
