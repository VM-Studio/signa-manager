import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sincronizar } from '@/lib/integracion/sincronizar'

/* =====================================================================
   POST /api/sync
   La dispara el cron de Vercel cada hora (ver vercel.json).

   No usa la sesión del usuario: se autentica con un token de entorno,
   porque quien la llama es una máquina.
   ===================================================================== */

// La sincronización toca la base y puede tardar: nunca se cachea.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function autorizado(peticion: NextRequest): boolean {
  const esperado = process.env.CRON_SECRET
  if (!esperado) return false

  const encabezado = peticion.headers.get('authorization')
  // Vercel Cron manda "Authorization: Bearer <CRON_SECRET>".
  if (encabezado === `Bearer ${esperado}`) return true

  // Y se acepta un header propio para poder dispararla a mano.
  return peticion.headers.get('x-signa-token') === esperado
}

export async function POST(peticion: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Falta CRON_SECRET en el entorno. Sin eso la ruta de sincronización queda deshabilitada.',
      },
      { status: 503 },
    )
  }

  if (!autorizado(peticion)) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const resultado = await sincronizar()

  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 500 })
}

/** El cron de Vercel usa GET; se acepta igual. */
export async function GET(peticion: NextRequest) {
  return POST(peticion)
}
