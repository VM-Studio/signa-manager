import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--fuente-archivo',
})

export const metadata: Metadata = {
  title: 'Signa',
  description: 'Sistema interno de Signa Constructora',
  applicationName: 'Signa',
  formatDetection: { telephone: false },
}

// Fondo negro declarado desde el arranque: en el celular el navegador pinta
// este color antes de cargar nada, así no hay un flash blanco antes del splash.
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
