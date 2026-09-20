import type { MetadataRoute } from 'next'

/**
 * El manifest de la PWA.
 *
 * Todo en negro: el color de tema y el de fondo son los que pinta el
 * sistema operativo mientras la app arranca, y si fueran blancos habría
 * un flash antes del splash.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Signa · sistema interno',
    short_name: 'Signa',
    description:
      'Herramientas, personal, vehículos y alertas de Signa Constructora.',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    lang: 'es-AR',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/iconos/icono-48.png', sizes: '48x48', type: 'image/png' },
      { src: '/iconos/icono-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/iconos/icono-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/iconos/icono-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/iconos/icono-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/iconos/icono-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/iconos/icono-256.png', sizes: '256x256', type: 'image/png' },
      { src: '/iconos/icono-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
      // Los maskable tienen zona segura: Android les recorta un círculo.
      {
        src: '/iconos/maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/iconos/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Cargar el parte de hoy',
        short_name: 'Parte',
        url: '/personal/partes/nuevo',
      },
      {
        name: 'Escanear una herramienta',
        short_name: 'Escanear',
        url: '/herramientas/escanear',
      },
      { name: 'Alertas', short_name: 'Alertas', url: '/alertas' },
    ],
  }
}
