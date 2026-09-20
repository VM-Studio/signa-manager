import 'server-only'

import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * Deja constancia de un cambio importante (regla de CLAUDE.md: las bajas
 * son lógicas y todo cambio importante deja un RegistroAuditoria).
 *
 * Nunca hace fallar la operación que la llamó: si la auditoría no se
 * puede escribir, se avisa por consola y la acción del usuario sigue.
 */
export async function registrarAuditoria(registro: {
  usuarioId?: string | null
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'APROBAR' | 'CERRAR' | 'DESACTIVAR' | 'ACTIVAR' | 'SINCRONIZAR'
  entidad: string
  entidadId: string
  antes?: Prisma.InputJsonValue | null
  despues?: Prisma.InputJsonValue | null
}): Promise<void> {
  try {
    await db.registroAuditoria.create({
      data: {
        usuarioId: registro.usuarioId ?? null,
        accion: registro.accion,
        entidad: registro.entidad,
        entidadId: registro.entidadId,
        antes: registro.antes ?? undefined,
        despues: registro.despues ?? undefined,
      },
    })
  } catch (error) {
    console.error('[auditoria] no se pudo registrar', registro.entidad, error)
  }
}
