/* =====================================================================
   Seed · REGLAS DE ALERTA
   Solo las reglas y sus umbrales por defecto. Las alertas en sí las
   genera el motor (prompt 8) corriendo contra estos mismos datos.
   ===================================================================== */

import { PrismaClient } from '@prisma/client'
import { CATALOGO_REGLAS } from '../../src/lib/alertas/catalogo'
import { paso, titulo } from './comun'

export async function sembrarReglasAlerta(db: PrismaClient): Promise<void> {
  titulo('Alertas')

  for (const r of CATALOGO_REGLAS) {
    await db.reglaAlerta.create({
      data: {
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        modulo: r.modulo,
        severidad: r.severidad,
        umbral: r.umbral,
        activa: true,
        rolesDestino: r.rolesDestino,
        canales: r.canales,
      },
    })
  }

  paso(`${CATALOGO_REGLAS.length} reglas de alerta activas`)
}
