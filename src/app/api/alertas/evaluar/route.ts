import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { evaluarAlertas } from '@/lib/alertas/motor'
import { procesarPendientes } from '@/lib/alertas/notificaciones'

/* =====================================================================
   POST /api/alertas/evaluar
   La dispara el cron de Vercel cada hora, diez minutos después de la
   sincronización: así las alertas de compras ven los pedidos nuevos.
   ===================================================================== */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function autorizado(peticion: NextRequest): boolean {
  const esperado = process.env.CRON_SECRET
  if (!esperado) return false

  return (
    peticion.headers.get('authorization') === `Bearer ${esperado}` ||
    peticion.headers.get('x-signa-token') === esperado
  )
}

export async function POST(peticion: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Falta CRON_SECRET en el entorno. Sin eso la evaluación de alertas queda deshabilitada.',
      },
      { status: 503 },
    )
  }

  if (!autorizado(peticion)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const resultado = await evaluarAlertas()
  const envios = await procesarPendientes()

  return NextResponse.json(
    { ...resultado, envios },
    { status: resultado.ok ? 200 : 500 },
  )
}

export async function GET(peticion: NextRequest) {
  return POST(peticion)
}
