import 'server-only'

import QRCode from 'qrcode'

/* =====================================================================
   Códigos QR de las herramientas.

   El QR lleva la URL de la ficha, no solo el código: así, si alguien lo
   escanea con la cámara del teléfono sin abrir la app, igual llega a la
   ficha. Y el escáner de la app sabe leer las dos cosas.
   ===================================================================== */

function urlBase(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function urlDeFicha(herramientaId: string): string {
  return `${urlBase()}/herramientas/${herramientaId}`
}

/** El QR como data URL, listo para meter en un <img>. */
export async function qrDataUrl(
  herramientaId: string,
  tamano = 320,
): Promise<string> {
  return QRCode.toDataURL(urlDeFicha(herramientaId), {
    width: tamano,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

/** Varios QR de una, para la hoja de etiquetas. */
export async function qrsDataUrl(
  ids: string[],
  tamano = 200,
): Promise<Map<string, string>> {
  const pares = await Promise.all(
    ids.map(async (id) => [id, await qrDataUrl(id, tamano)] as const),
  )
  return new Map(pares)
}

/**
 * Qué código se leyó.
 * Acepta la URL completa de la ficha o el código pelado (SIG-H-0042),
 * porque algunos lectores baratos devuelven solo el texto.
 */
export function interpretarLectura(texto: string): {
  tipo: 'id' | 'codigo'
  valor: string
} | null {
  const limpio = texto.trim()
  if (!limpio) return null

  const enLaUrl = limpio.match(/\/herramientas\/([A-Za-z0-9_-]+)/)
  if (enLaUrl) return { tipo: 'id', valor: enLaUrl[1] }

  if (/^SIG-H-\d{4}$/i.test(limpio)) {
    return { tipo: 'codigo', valor: limpio.toUpperCase() }
  }

  // Cualquier otra cosa se prueba como código, por si cambia el formato.
  return { tipo: 'codigo', valor: limpio.toUpperCase() }
}
