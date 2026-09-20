import { PrismaClient } from '@prisma/client'

// Cliente Prisma singleton.
// En desarrollo Next.js recarga los modulos en caliente y, sin esto, cada
// recarga abriria un pool nuevo hasta agotar las conexiones de Postgres.
const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = db
}

export default db
