import 'server-only'

import { db } from '@/lib/db'

/* =====================================================================
   Reinicio de los datos de demostración.

   Es el mismo seed que se corre con `npm run db:seed`, pero llamado
   desde la app para poder reiniciar antes de una presentación sin
   abrir una terminal.
   ===================================================================== */

export interface ResultadoReinicio {
  tablas: number
  registros: number
  duracion: number
}

export async function reiniciarDatosDeDemostracion(): Promise<ResultadoReinicio> {
  if (process.env.MODO_DEMO !== 'true') {
    throw new Error('El reinicio de datos solo funciona con MODO_DEMO en true.')
  }

  const arranque = Date.now()

  // Los módulos del seed se importan acá y no arriba para que no entren
  // al bundle de producción cuando MODO_DEMO está apagado.
  const [
    { sembrarNucleo },
    { sembrarPersonal, sembrarQuincenas },
    { sembrarHerramientas },
    { sembrarVehiculos },
    { sembrarSistemaBase },
    { sembrarReglasAlerta },
  ] = await Promise.all([
    import('../../prisma/seed/nucleo'),
    import('../../prisma/seed/personal'),
    import('../../prisma/seed/herramientas'),
    import('../../prisma/seed/vehiculos'),
    import('../../prisma/seed/sistema-base'),
    import('../../prisma/seed/alertas'),
  ])

  const tablas = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `

  if (tablas.length > 0) {
    const lista = tablas.map((t) => `"public"."${t.tablename}"`).join(', ')
    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`,
    )
  }

  const nucleo = await sembrarNucleo(db)
  const personal = await sembrarPersonal(db, nucleo)
  await sembrarHerramientas(db, nucleo, personal)
  await sembrarVehiculos(db, nucleo, personal)
  await sembrarQuincenas(db, nucleo, personal)
  await sembrarSistemaBase(db, nucleo)
  await sembrarReglasAlerta(db)

  // El motor deja las alertas al día para que la demo las muestre.
  const { evaluarAlertas } = await import('@/lib/alertas/motor')
  await evaluarAlertas()

  const [obras, herramientas, empleados, alertas] = await Promise.all([
    db.obra.count(),
    db.herramienta.count(),
    db.empleado.count(),
    db.alerta.count(),
  ])

  return {
    tablas: tablas.length,
    registros: obras + herramientas + empleados + alertas,
    duracion: Date.now() - arranque,
  }
}
