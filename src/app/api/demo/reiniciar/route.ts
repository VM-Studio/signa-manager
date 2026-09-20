import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { obtenerSesion } from '@/lib/auth/sesion'

/* =====================================================================
   POST /api/demo/reiniciar

   Vuelve a cargar los datos de ejemplo antes de una presentación.
   Solo existe con MODO_DEMO en true, y solo la puede usar el dueño o
   administración: en producción esta ruta devuelve 404.
   ===================================================================== */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(peticion: NextRequest) {
  // Sin modo demo la ruta ni existe.
  if (process.env.MODO_DEMO !== 'true') {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const sesion = await obtenerSesion()
  if (!sesion || (sesion.rol !== 'DUENO' && sesion.rol !== 'ADMINISTRACION')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Hay que confirmar a propósito: esto borra todo lo cargado en la demo.
  const confirmacion = peticion.nextUrl.searchParams.get('confirmar')
  if (confirmacion !== 'si') {
    return NextResponse.json(
      {
        error:
          'Esto borra todos los datos y vuelve a cargar los de ejemplo. Agregá ?confirmar=si para hacerlo.',
      },
      { status: 400 },
    )
  }

  try {
    /*
     * El seed vive en prisma/seed.ts y usa tsx, que no está en producción.
     * Por eso se importa en tiempo de ejecución: si el archivo no está,
     * la ruta avisa en vez de romper el build.
     */
    const { reiniciarDatosDeDemostracion } = await import('@/lib/demo')
    const resultado = await reiniciarDatosDeDemostracion()

    return NextResponse.json({ ok: true, ...resultado })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron reiniciar los datos.',
      },
      { status: 500 },
    )
  }
}
