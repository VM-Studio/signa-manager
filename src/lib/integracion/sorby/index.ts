import 'server-only'

import { Moneda } from '@prisma/client'
import { ErrorIntegracion } from '../tipos'
import type {
  MovimientoExternoNormalizado,
  ObraExterna,
  PedidoCompraExternoNormalizado,
  SistemaBase,
} from '../tipos'
import {
  CATEGORIAS,
  COLUMNAS,
  ESTADOS_OBRA,
  ESTADOS_PEDIDO,
  HOJAS,
  POR_DEFECTO,
  TIPOS_MOVIMIENTO,
  TIPOS_OBRA,
} from './mapeo'
import {
  campo,
  fechaDesdePlanilla,
  leerHoja,
  normalizar,
  numeroDesdePlanilla,
  traducir,
  type Fila,
} from './planilla'

/* =====================================================================
   Adaptador de Sorby.

   Sorby sincroniza automáticamente contra una planilla de Google Sheets:
   la app la lee con una cuenta de servicio y la traduce a nuestros tipos.

   Todo lo que depende del formato de la planilla vive en `mapeo.ts`.
   Este archivo no tiene ni un nombre de columna escrito a mano: cuando
   tengamos la planilla real se ajusta el mapeo y esto sigue igual.
   ===================================================================== */

function monedaDesde(valor: string | null): Moneda {
  if (!valor) return Moneda.ARS
  const t = normalizar(valor)
  return t.includes('usd') || t.includes('dolar') || t.includes('u$s')
    ? Moneda.USD
    : Moneda.ARS
}

export class AdaptadorSorby implements SistemaBase {
  readonly fuente = 'sorby' as const
  readonly nombre = 'Sorby'

  /**
   * Filas que se leyeron pero venían incompletas. No frenan la
   * sincronización: se informan al final para poder arreglar la planilla.
   */
  private advertencias: string[] = []

  obtenerAdvertencias(): string[] {
    return this.advertencias
  }

  // ------------------------------ OBRAS ------------------------------

  async listarObras(): Promise<ObraExterna[]> {
    this.advertencias = []
    const filas = await leerHoja(HOJAS.obras)
    const c = COLUMNAS.obras

    if (filas.length === 0) {
      throw new ErrorIntegracion(
        'sorby',
        `La hoja "${HOJAS.obras}" de la planilla está vacía o no tiene encabezados.`,
        'Revisá que la primera fila tenga los títulos de las columnas.',
      )
    }

    const obras: ObraExterna[] = []

    for (const [i, fila] of filas.entries()) {
      const codigo = campo(fila, c.codigo)
      // Sin código no hay obra: es la clave que comparten los dos sistemas.
      if (!codigo) {
        this.advertencias.push(
          `Obras, fila ${i + 2}: sin código de obra. Se salteó.`,
        )
        continue
      }

      const tipo = traducir(campo(fila, c.tipo), TIPOS_OBRA, POR_DEFECTO.tipoObra)
      const estado = traducir(
        campo(fila, c.estado),
        ESTADOS_OBRA,
        POR_DEFECTO.estadoObra,
      )

      if (!estado.reconocido && campo(fila, c.estado)) {
        this.advertencias.push(
          `Obras, fila ${i + 2}: estado "${campo(fila, c.estado)}" no reconocido. Se tomó "${estado.valor}".`,
        )
      }

      obras.push({
        // Si la planilla no trae un id propio, el código hace de id.
        idExterno: campo(fila, c.idExterno) ?? codigo,
        codigo,
        nombre: campo(fila, c.nombre) ?? codigo,
        tipo: tipo.valor,
        estado: estado.valor,
        cliente: campo(fila, c.cliente),
        unidadNegocio: campo(fila, c.unidadNegocio),
        presupuestoTotal: numeroDesdePlanilla(campo(fila, c.presupuestoTotal)),
        moneda: monedaDesde(campo(fila, c.moneda)),
        fechaInicio: fechaDesdePlanilla(campo(fila, c.fechaInicio)),
        fechaFinPrevista: fechaDesdePlanilla(campo(fila, c.fechaFinPrevista)),
        fechaFinReal: fechaDesdePlanilla(campo(fila, c.fechaFinReal)),
      })
    }

    return obras
  }

  // --------------------------- MOVIMIENTOS ---------------------------

  async listarMovimientos(desde: Date): Promise<MovimientoExternoNormalizado[]> {
    const filas = await leerHoja(HOJAS.movimientos)
    const c = COLUMNAS.movimientos
    const movimientos: MovimientoExternoNormalizado[] = []

    for (const [i, fila] of filas.entries()) {
      const fecha = fechaDesdePlanilla(campo(fila, c.fecha))
      if (!fecha) {
        this.advertencias.push(
          `Movimientos, fila ${i + 2}: sin fecha válida. Se salteó.`,
        )
        continue
      }
      // La planilla trae todo el histórico; acá solo interesa lo nuevo.
      if (fecha < desde) continue

      const monto = numeroDesdePlanilla(campo(fila, c.monto))
      if (monto === null) {
        this.advertencias.push(
          `Movimientos, fila ${i + 2}: sin importe. Se salteó.`,
        )
        continue
      }

      const tipo = traducir(
        campo(fila, c.tipo),
        TIPOS_MOVIMIENTO,
        POR_DEFECTO.tipoMovimiento,
      )
      const categoria = traducir(
        campo(fila, c.categoria),
        CATEGORIAS,
        POR_DEFECTO.categoria,
      )

      if (!categoria.reconocido && campo(fila, c.categoria)) {
        this.advertencias.push(
          `Movimientos, fila ${i + 2}: categoría "${campo(fila, c.categoria)}" no reconocida. Quedó como "Otros".`,
        )
      }

      const moneda = monedaDesde(campo(fila, c.moneda))

      movimientos.push({
        // Sin id propio se arma uno estable con fecha, monto y fila, para
        // que el upsert no duplique en la próxima corrida.
        idExterno:
          campo(fila, c.idExterno) ??
          `${fecha.toISOString().slice(0, 10)}-${Math.round(monto)}-${i}`,
        tipo: tipo.valor,
        categoria: categoria.valor,
        fecha,
        descripcion: campo(fila, c.descripcion),
        proveedor: campo(fila, c.proveedor),
        monto: Math.abs(monto),
        moneda,
        tipoCambio:
          moneda === Moneda.USD
            ? numeroDesdePlanilla(campo(fila, c.tipoCambio))
            : null,
        codigoObra: campo(fila, c.codigoObra),
      })
    }

    return movimientos
  }

  // ------------------------ PEDIDOS DE COMPRA ------------------------

  async listarPedidosCompra(
    desde: Date,
  ): Promise<PedidoCompraExternoNormalizado[]> {
    const filas = await leerHoja(HOJAS.pedidos)
    const c = COLUMNAS.pedidos
    const pedidos: PedidoCompraExternoNormalizado[] = []

    for (const [i, fila] of filas.entries()) {
      const codigoObra = campo(fila, c.codigoObra)
      if (!codigoObra) {
        this.advertencias.push(
          `Pedidos, fila ${i + 2}: sin obra. Se salteó.`,
        )
        continue
      }

      const fechaSolicitud = fechaDesdePlanilla(campo(fila, c.fechaSolicitud))
      if (!fechaSolicitud) {
        this.advertencias.push(
          `Pedidos, fila ${i + 2}: sin fecha de solicitud. Se salteó.`,
        )
        continue
      }
      if (fechaSolicitud < desde) continue

      const estado = traducir(
        campo(fila, c.estado),
        ESTADOS_PEDIDO,
        POR_DEFECTO.estadoPedido,
      )

      pedidos.push({
        idExterno:
          campo(fila, c.idExterno) ??
          campo(fila, c.numero) ??
          `${codigoObra}-${fechaSolicitud.toISOString().slice(0, 10)}-${i}`,
        numero: campo(fila, c.numero),
        descripcion: campo(fila, c.descripcion) ?? 'Sin descripción',
        solicitante: campo(fila, c.solicitante),
        proveedor: campo(fila, c.proveedor),
        estado: estado.valor,
        monto: numeroDesdePlanilla(campo(fila, c.monto)),
        moneda: monedaDesde(campo(fila, c.moneda)),
        fechaSolicitud,
        fechaNecesariaEnObra: fechaDesdePlanilla(
          campo(fila, c.fechaNecesariaEnObra),
        ),
        fechaAprobacion: fechaDesdePlanilla(campo(fila, c.fechaAprobacion)),
        fechaEntregaEstimada: fechaDesdePlanilla(
          campo(fila, c.fechaEntregaEstimada),
        ),
        fechaEntregaReal: fechaDesdePlanilla(campo(fila, c.fechaEntregaReal)),
        codigoObra,
      })
    }

    return pedidos
  }
}

export type { Fila }
