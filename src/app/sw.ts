import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/* =====================================================================
   Service worker.

   Lo que se guarda en caché:
   · la estructura de la app (lo que precachea Serwist)
   · las imágenes y las fuentes
   · una página sin conexión con el logo

   Lo que NO se guarda: nada de la base. Un parte diario viejo mostrado
   como si fuera de hoy sería peor que no mostrar nada.
   ===================================================================== */

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/sin-conexion',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
