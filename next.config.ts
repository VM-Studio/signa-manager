import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const conServiceWorker = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // En desarrollo el service worker estorba: cachea cosas viejas y
  // obliga a recargar dos veces cada cambio.
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
})

const nextConfig: NextConfig = {
  // Cabeceras de seguridad para toda la app.
  async headers() {
    return [
      {
        source: '/:ruta*',
        headers: [
          /*
           * Nadie puede meter la app en un iframe: evita el clickjacking.
           *
           * En desarrollo se permite el mismo origen para poder abrir la
           * app en un iframe angosto y revisar el diseño responsive sin
           * depender del tamaño de la ventana del navegador. En
           * producción sigue siendo DENY.
           */
          {
            key: 'X-Frame-Options',
            value:
              process.env.NODE_ENV === 'development' ? 'SAMEORIGIN' : 'DENY',
          },
          // El navegador no adivina el tipo de contenido.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No se filtra la URL interna al salir a un sitio externo.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La app pide la cámara para el escáner de QR; nada más.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          // HTTPS obligatorio una vez publicada.
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      {
        // El service worker nunca se cachea: si no, un bug queda pegado.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
}

export default conServiceWorker(nextConfig)
