import { ErrorIntegracion } from '../tipos'
import { FORMATO_FECHA, FORMATO_NUMERO } from './mapeo'

/* =====================================================================
   Lectura de la planilla de Google Sheets.

   Se habla directo con la API REST de Sheets, sin librería: lo único que
   hace falta es un token de acceso, y para eso alcanza con firmar un JWT
   con la clave de la cuenta de servicio. Meter googleapis entero para
   leer tres hojas no se justifica.
   ===================================================================== */

interface Credenciales {
  idPlanilla: string
  email: string
  clavePrivada: string
}

/**
 * Las credenciales del entorno, o un error que explica qué falta y cómo
 * conseguirlo. Nada de "undefined is not an object" a las tres de la
 * mañana.
 */
export function leerCredenciales(): Credenciales {
  const idPlanilla = process.env.SORBY_SHEET_ID
  const email = process.env.SORBY_SERVICE_ACCOUNT_EMAIL
  const clavePrivada = process.env.SORBY_SERVICE_ACCOUNT_KEY

  const faltan: string[] = []
  if (!idPlanilla) faltan.push('SORBY_SHEET_ID')
  if (!email) faltan.push('SORBY_SERVICE_ACCOUNT_EMAIL')
  if (!clavePrivada) faltan.push('SORBY_SERVICE_ACCOUNT_KEY')

  if (faltan.length > 0) {
    throw new ErrorIntegracion(
      'sorby',
      `Falta configurar ${faltan.join(', ')} para conectarse con la planilla de Sorby.`,
      'Creá una cuenta de servicio en Google Cloud, habilitá la API de Google Sheets, compartí la planilla con el email de la cuenta de servicio con permiso de lectura, y cargá las tres variables en el entorno.',
    )
  }

  return {
    idPlanilla: idPlanilla as string,
    email: email as string,
    // En las variables de entorno los saltos de línea de la clave vienen
    // escapados; hay que devolvérselos para que el PEM sea válido.
    clavePrivada: (clavePrivada as string).replace(/\\n/g, '\n'),
  }
}

/* --------------------------- AUTENTICACIÓN --------------------------- */

const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

function base64url(datos: Uint8Array | string): string {
  const bytes =
    typeof datos === 'string' ? new TextEncoder().encode(datos) : datos
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Convierte la clave PEM de la cuenta de servicio en una CryptoKey. */
async function importarClave(pem: string): Promise<CryptoKey> {
  const cuerpo = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binario = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0))

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      binario,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  } catch {
    throw new ErrorIntegracion(
      'sorby',
      'La clave privada de la cuenta de servicio de Google no tiene un formato válido.',
      'Copiá el campo private_key del JSON de la cuenta de servicio tal cual, incluidas las líneas BEGIN y END.',
    )
  }
}

/**
 * Token de acceso de Google, por el flujo de cuenta de servicio:
 * se firma un JWT con la clave privada y se lo canjea por un token.
 */
async function obtenerToken(credenciales: Credenciales): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000)

  const encabezado = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const cuerpo = base64url(
    JSON.stringify({
      iss: credenciales.email,
      scope: ALCANCE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: ahora,
      exp: ahora + 3600,
    }),
  )

  const clave = await importarClave(credenciales.clavePrivada)
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    clave,
    new TextEncoder().encode(`${encabezado}.${cuerpo}`),
  )

  const jwt = `${encabezado}.${cuerpo}.${base64url(new Uint8Array(firma))}`

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new ErrorIntegracion(
      'sorby',
      `Google rechazó las credenciales de la cuenta de servicio (${respuesta.status}).`,
      `Revisá que la API de Google Sheets esté habilitada en el proyecto. Respuesta: ${detalle.slice(0, 200)}`,
    )
  }

  const datos = (await respuesta.json()) as { access_token?: string }
  if (!datos.access_token) {
    throw new ErrorIntegracion(
      'sorby',
      'Google no devolvió un token de acceso.',
      'Volvé a generar la clave de la cuenta de servicio.',
    )
  }

  return datos.access_token
}

/* ---------------------------- LECTURA -------------------------------- */

/** Una fila de la planilla, ya indexada por el título de su columna. */
export type Fila = Record<string, string>

/**
 * Trae una hoja entera y la devuelve como filas indexadas por el título
 * de cada columna. La primera fila se toma como encabezado.
 */
export async function leerHoja(nombreHoja: string): Promise<Fila[]> {
  const credenciales = leerCredenciales()
  const token = await obtenerToken(credenciales)

  const rango = encodeURIComponent(`${nombreHoja}!A1:ZZ`)
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${credenciales.idPlanilla}` +
    `/values/${rango}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`

  const respuesta = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    // Los datos de la planilla cambian todo el tiempo: nunca cachear.
    cache: 'no-store',
  })

  if (respuesta.status === 403) {
    throw new ErrorIntegracion(
      'sorby',
      'La cuenta de servicio no tiene acceso a la planilla de Sorby.',
      `Compartí la planilla con ${credenciales.email} dándole permiso de lectura.`,
    )
  }

  if (respuesta.status === 404) {
    throw new ErrorIntegracion(
      'sorby',
      `No se encontró la planilla o la hoja "${nombreHoja}".`,
      'Revisá SORBY_SHEET_ID y el nombre de la hoja en el archivo de mapeo (src/lib/integracion/sorby/mapeo.ts).',
    )
  }

  if (!respuesta.ok) {
    throw new ErrorIntegracion(
      'sorby',
      `Google Sheets devolvió un error al leer "${nombreHoja}" (${respuesta.status}).`,
    )
  }

  const datos = (await respuesta.json()) as { values?: unknown[][] }
  const valores = datos.values ?? []
  if (valores.length < 2) return []

  const encabezados = (valores[0] as unknown[]).map((c) => String(c ?? '').trim())

  return valores.slice(1).map((fila) => {
    const objeto: Fila = {}
    encabezados.forEach((titulo, i) => {
      if (titulo) objeto[titulo] = String((fila as unknown[])[i] ?? '').trim()
    })
    return objeto
  })
}

/* ------------------------- LECTURA DE CAMPOS ------------------------- */

/** Compara sin tildes, sin espacios de más y en minúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * El valor de la primera columna de la lista que exista en la fila.
 * La comparación de títulos es tolerante: "Código de obra", "codigo de
 * obra" y "CÓDIGO DE OBRA " son lo mismo.
 */
export function campo(fila: Fila, alias: readonly string[]): string | null {
  const indice = new Map(
    Object.entries(fila).map(([titulo, valor]) => [normalizar(titulo), valor]),
  )
  for (const nombre of alias) {
    const valor = indice.get(normalizar(nombre))
    if (valor !== undefined && valor !== '') return valor
  }
  return null
}

/** Busca el valor en un diccionario; si no está, devuelve el por defecto. */
export function traducir<T>(
  valor: string | null,
  diccionario: Record<string, T>,
  porDefecto: T,
): { valor: T; reconocido: boolean } {
  if (!valor) return { valor: porDefecto, reconocido: false }
  const encontrado = diccionario[normalizar(valor)]
  return encontrado !== undefined
    ? { valor: encontrado, reconocido: true }
    : { valor: porDefecto, reconocido: false }
}

/**
 * Número desde un texto de planilla.
 * El problema real: "1.250.000,50" y "1,250,000.50" son el mismo número
 * escrito distinto, y Sheets devuelve uno u otro según la configuración
 * regional del documento.
 */
export function numeroDesdePlanilla(valor: string | null): number | null {
  if (valor === null || valor === '') return null

  let texto = valor.replace(/[^\d.,\-]/g, '').trim()
  if (texto === '' || texto === '-') return null

  if (FORMATO_NUMERO === 'es-AR') {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (FORMATO_NUMERO === 'en-US') {
    texto = texto.replace(/,/g, '')
  } else {
    // Automático: el último separador que aparece es el decimal.
    const ultimaComa = texto.lastIndexOf(',')
    const ultimoPunto = texto.lastIndexOf('.')
    if (ultimaComa > ultimoPunto) {
      texto = texto.replace(/\./g, '').replace(',', '.')
    } else {
      texto = texto.replace(/,/g, '')
    }
  }

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

/** Fecha desde un texto de planilla. Prueba los formatos que se usan acá. */
export function fechaDesdePlanilla(valor: string | null): Date | null {
  if (!valor) return null
  const texto = valor.trim()

  if (FORMATO_FECHA === 'aaaa-mm-dd' || /^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const d = new Date(texto.length === 10 ? `${texto}T00:00:00` : texto)
    return Number.isNaN(d.getTime()) ? null : d
  }

  // dd/mm/aaaa y dd-mm-aaaa, con año de dos o cuatro dígitos.
  const partes = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (partes) {
    const dia = Number(partes[1])
    const mes = Number(partes[2])
    let anio = Number(partes[3])
    if (anio < 100) anio += 2000
    const d = new Date(anio, mes - 1, dia)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(texto)
  return Number.isNaN(d.getTime()) ? null : d
}
