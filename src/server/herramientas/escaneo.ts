'use server'

import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import { interpretarLectura } from '@/lib/qr'
import { accionMasProbable } from './movimientos'
import type { HerramientaEscaneada } from '@/components/herramientas/Escaner'

/**
 * Qué herramienta es la que se escaneó.
 * Acepta la URL del QR o el código escrito a mano.
 */
export async function buscarEscaneada(
  texto: string,
): Promise<HerramientaEscaneada | null> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.ver')

  const lectura = interpretarLectura(texto)
  if (!lectura) return null

  const herramienta = await db.herramienta.findFirst({
    where:
      lectura.tipo === 'id'
        ? { id: lectura.valor }
        : { codigo: lectura.valor },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      tipoControl: true,
      depositoId: true,
      obraId: true,
      deposito: { select: { nombre: true } },
      obra: { select: { codigo: true, nombre: true } },
    },
  })

  if (!herramienta) return null

  return {
    id: herramienta.id,
    codigo: herramienta.codigo,
    nombre: herramienta.nombre,
    estado: herramienta.estado,
    accionSugerida: accionMasProbable(herramienta),
    ubicacion:
      herramienta.deposito?.nombre ??
      (herramienta.obra
        ? `${herramienta.obra.codigo} · ${herramienta.obra.nombre}`
        : null),
  }
}
