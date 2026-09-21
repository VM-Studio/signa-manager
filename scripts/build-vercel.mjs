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

const FALTANTES = ['DATABASE_URL', 'AUTH_SECRET'].filter((v) => !process.env[v])

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

/* --------------------------- 2. El cliente ---------------------------- */

paso('Generando el cliente de Prisma', 'npx', ['prisma', 'generate'])

/* ------------------------- 3. Las migraciones ------------------------- */

/*
 * Neon y Supabase entregan una conexión por pooler (pgbouncer). Sirve
 * para consultar, pero no para migrar: las migraciones toman un lock y
 * usan sentencias preparadas, que el pooler no sostiene. Si está
 * DIRECT_URL, se migra por ahí y la app sigue usando el pooler.
 */
const urlParaMigrar = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (process.env.DIRECT_URL) {
  console.log(`${GRIS}  (migrando por DIRECT_URL, no por el pooler)${FIN}`)
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

/* ---------------------------- 4. El build ----------------------------- */

paso('Compilando la app', 'npx', ['next', 'build'])

console.log('\nListo.\n')
