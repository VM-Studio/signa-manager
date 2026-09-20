import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--fuente-archivo',
})

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  title: { default: 'Signa', template: '%s · Signa' },
  description: 'Sistema interno de Signa Constructora',
  applicationName: 'Signa',
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  // Es una app interna: no tiene que aparecer en ningún buscador.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/iconos/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/iconos/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/iconos/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Signa',
    // Negro para que la barra de estado se funda con el header.
    statusBarStyle: 'black-translucent',
    startupImage: [
      {
        url: '/iconos/inicio-iphone-15.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/iconos/inicio-iphone-max.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/iconos/inicio-iphone-13.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/iconos/inicio-iphone-x.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/iconos/inicio-iphone-8.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/iconos/inicio-ipad-air.png',
        media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
}

/**
 * Fondo negro declarado desde el arranque: en el celular el navegador
 * pinta este color antes de cargar nada, así no hay flash blanco antes
 * del splash.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>{children}</body>
    </html>
  )
}
