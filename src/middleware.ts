import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { NOMBRE_COOKIE, verificarToken } from '@/lib/auth/token'

/* =====================================================================
   Protege todas las rutas salvo /login y los archivos estáticos.
   Corre antes de cualquier página, así que no puede tocar la base:
   solo verifica la firma del token.
   ===================================================================== */

const RUTAS_PUBLICAS = ['/login']

/** Rutas de API que se autentican con su propio token de servicio. */
const RUTAS_CON_TOKEN_PROPIO = ['/api/sync', '/api/alertas/evaluar']

export async function middleware (peticion: NextRequest) {
  const { pathname } = peticion.nextUrl

  if (RUTAS_CON_TOKEN_PROPIO.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  )

  const token = peticion.cookies.get(NOMBRE_COOKIE)?.value
  const sesion = token ? await verificarToken(token) : null

  // Ya tiene sesión y va al login: lo mandamos a su inicio.
  if (esPublica && sesion) {
    return NextResponse.redirect(new URL('/inicio', peticion.url))
  }

  if (esPublica) return NextResponse.next()

  if (!sesion) {
    const destino = new URL('/login', peticion.url)
    // Se guarda a dónde quería ir para volver ahí después de entrar.
    if (pathname !== '/') destino.searchParams.set('volverA', pathname)
    const respuesta = NextResponse.redirect(destino)
    // Si el token estaba vencido o manipulado, se limpia la cookie.
    if (token) respuesta.cookies.delete(NOMBRE_COOKIE)
    return respuesta
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Todo menos:
     *   _next/static, _next/image  · archivos que genera Next
     *   favicon, manifest, íconos  · archivos de la PWA
     *   signalogo.png              · el logo del splash y del login
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|signalogo.png|iconos/|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)',
  ],
}
