import 'server-only'

import { AdaptadorMock } from './mock'
import { AdaptadorSorby } from './sorby'
import { AdaptadorLebane } from './lebane'
import { ErrorIntegracion, FUENTES, NOMBRE_FUENTE } from './tipos'
import type { FuenteSistemaBase, SistemaBase } from './tipos'

/* =====================================================================
   Elección del adaptador.

   Un solo lugar decide con qué sistema base habla la app. El resto del
   código pide `sistemaBase()` y no sabe ni le importa cuál es.
   ===================================================================== */

/** La fuente configurada en el entorno. Si no hay nada, datos de ejemplo. */
export function fuenteConfigurada(): FuenteSistemaBase {
  const valor = (process.env.SISTEMA_BASE ?? 'mock').trim().toLowerCase()

  if (!FUENTES.includes(valor as FuenteSistemaBase)) {
    throw new ErrorIntegracion(
      'mock',
      `SISTEMA_BASE tiene el valor "${valor}", que no es ninguno de los sistemas conocidos.`,
      `Poné una de estas opciones: ${FUENTES.join(', ')}.`,
    )
  }

  return valor as FuenteSistemaBase
}

export function sistemaBase(fuente?: FuenteSistemaBase): SistemaBase {
  const elegida = fuente ?? fuenteConfigurada()

  switch (elegida) {
    case 'sorby':
      return new AdaptadorSorby()
    case 'lebane':
      return new AdaptadorLebane()
    case 'mock':
    default:
      return new AdaptadorMock()
  }
}

export { ErrorIntegracion, FUENTES, NOMBRE_FUENTE }
export type {
  FuenteSistemaBase,
  MovimientoExternoNormalizado,
  ObraExterna,
  PedidoCompraExternoNormalizado,
  SistemaBase,
} from './tipos'
