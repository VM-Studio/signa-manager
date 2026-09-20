import 'server-only'

import { ErrorIntegracion } from './tipos'
import type {
  MovimientoExternoNormalizado,
  ObraExterna,
  PedidoCompraExternoNormalizado,
  SistemaBase,
} from './tipos'

/* =====================================================================
   Adaptador de Lebane.
   ---------------------------------------------------------------------
   Lebane todavía no está decidido y no conocemos su API. La estructura
   está lista y contempla las dos formas en que puede llegar la
   información:

     · por API REST  → LEBANE_API_URL + LEBANE_API_TOKEN
     · por archivo   → LEBANE_ARCHIVO, ruta o URL de un export (JSON o CSV)

   QUÉ FALTA COMPLETAR (está marcado con COMPLETAR en cada lugar):
     1. Las rutas de los tres endpoints, o el formato del export.
     2. El mapeo de cada campo, igual que se hizo para Sorby en
        src/lib/integracion/sorby/mapeo.ts.
     3. Los diccionarios de estados y categorías de Lebane.

   Mientras tanto, cualquier llamada falla con un mensaje claro y la
   sincronización lo registra como error, sin dejar nada a medias.
   ===================================================================== */

type ModoLebane = 'api' | 'archivo'

interface ConfiguracionLebane {
  modo: ModoLebane
  urlApi?: string
  token?: string
  archivo?: string
}

/** COMPLETAR: las rutas reales cuando tengamos la documentación. */
const ENDPOINTS = {
  obras: '/obras',
  movimientos: '/movimientos',
  pedidos: '/pedidos-compra',
} as const

function leerConfiguracion(): ConfiguracionLebane {
  const urlApi = process.env.LEBANE_API_URL
  const token = process.env.LEBANE_API_TOKEN
  const archivo = process.env.LEBANE_ARCHIVO

  if (urlApi && token) {
    return { modo: 'api', urlApi: urlApi.replace(/\/$/, ''), token }
  }

  if (archivo) {
    return { modo: 'archivo', archivo }
  }

  throw new ErrorIntegracion(
    'lebane',
    'Falta configurar la conexión con Lebane.',
    'Cargá LEBANE_API_URL y LEBANE_API_TOKEN para leer por API, o LEBANE_ARCHIVO con la ruta del archivo exportado.',
  )
}

/** Error único para todo lo que todavía no está implementado. */
function faltaImplementar(que: string): never {
  throw new ErrorIntegracion(
    'lebane',
    `El adaptador de Lebane todavía no sabe leer ${que}.`,
    'Falta completar el mapeo de campos en src/lib/integracion/lebane.ts. Hasta entonces, usá SISTEMA_BASE=mock o SISTEMA_BASE=sorby.',
  )
}

export class AdaptadorLebane implements SistemaBase {
  readonly fuente = 'lebane' as const
  readonly nombre = 'Lebane'

  /**
   * Pide un recurso a la API de Lebane. El manejo de errores ya está
   * hecho; lo que falta es el mapeo de la respuesta.
   */
  private async pedir<T>(ruta: string): Promise<T> {
    const config = leerConfiguracion()

    if (config.modo === 'archivo') {
      faltaImplementar('el archivo exportado')
    }

    const respuesta = await fetch(`${config.urlApi}${ruta}`, {
      headers: {
        authorization: `Bearer ${config.token}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new ErrorIntegracion(
        'lebane',
        'Lebane rechazó el token de acceso.',
        'Revisá LEBANE_API_TOKEN y que el usuario tenga permiso de lectura.',
      )
    }

    if (!respuesta.ok) {
      throw new ErrorIntegracion(
        'lebane',
        `Lebane devolvió un error al pedir ${ruta} (${respuesta.status}).`,
      )
    }

    return (await respuesta.json()) as T
  }

  async listarObras(): Promise<ObraExterna[]> {
    // COMPLETAR: traer la respuesta y mapearla a ObraExterna.
    //   const datos = await this.pedir<unknown[]>(ENDPOINTS.obras)
    //   return datos.map(...)
    void ENDPOINTS.obras
    void this.pedir
    faltaImplementar('las obras')
  }

  async listarMovimientos(
    desde: Date,
  ): Promise<MovimientoExternoNormalizado[]> {
    // COMPLETAR: la API tendría que aceptar un filtro por fecha, algo
    // como `${ENDPOINTS.movimientos}?desde=${desde.toISOString()}`.
    void desde
    faltaImplementar('los movimientos')
  }

  async listarPedidosCompra(
    desde: Date,
  ): Promise<PedidoCompraExternoNormalizado[]> {
    // COMPLETAR: igual que los movimientos.
    void desde
    faltaImplementar('los pedidos de compra')
  }
}
