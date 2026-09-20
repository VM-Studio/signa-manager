import 'server-only'

import { EstadoPedidoCompra, EstadoSync, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import {
  clave,
  diasDesde,
  diasHasta,
  enDias,
  fecha,
  haceHoras,
  hoyCero,
  plata,
  plural,
  type Hallazgo,
  type Regla,
} from './tipos'

/* =====================================================================
   Reglas de compras y del sistema.

   Las de compras trabajan sobre las tablas espejo: los pedidos se
   cargan y se aprueban en el sistema base, pero es acá donde se avisa
   que hay uno frenado.
   ===================================================================== */

/** Pedido esperando aprobación en el sistema base. */
export const pedidoSinAprobar: Regla = {
  codigo: 'PEDIDO_SIN_APROBAR',
  modulo: 'compras',
  async evaluar(config) {
    const limite = enDias(-config.umbral)

    const pedidos = await db.pedidoCompraExterno.findMany({
      where: {
        estado: EstadoPedidoCompra.PENDIENTE_APROBACION,
        fechaSolicitud: { lt: limite },
      },
      select: {
        id: true,
        numero: true,
        descripcion: true,
        monto: true,
        fechaSolicitud: true,
        fechaNecesariaEnObra: true,
        obraId: true,
        obra: { select: { codigo: true, nombre: true } },
      },
    })

    return pedidos.map((p): Hallazgo => {
      const espera = diasDesde(p.fechaSolicitud)
      // Si además ya pasó la fecha en que se necesitaba, es crítico.
      const yaLoNecesitaban =
        p.fechaNecesariaEnObra !== null && p.fechaNecesariaEnObra < hoyCero()

      return {
        claveUnica: clave(config.codigo, 'PedidoCompraExterno', p.id),
        titulo: `Pedido sin aprobar hace ${plural(espera, 'día')}`,
        detalle: `${p.numero ? `${p.numero}: ` : ''}${p.descripcion}${
          p.monto ? ` por ${plata(Number(p.monto))}` : ''
        } para ${p.obra.codigo}.${
          p.fechaNecesariaEnObra
            ? ` Tenía que estar en obra el ${fecha(p.fechaNecesariaEnObra)}.`
            : ''
        } Esto es lo que frena una obra sin que nadie se entere.`,
        entidadTipo: 'PedidoCompraExterno',
        entidadId: p.id,
        enlace: `/obras/${p.obraId}?pestana=compras`,
        obraId: p.obraId,
        severidad: yaLoNecesitaban ? Severidad.CRITICA : config.severidad,
      }
    })
  },
}

/** El material tenía que estar en obra y no llegó. */
export const materialNoEntregado: Regla = {
  codigo: 'MATERIAL_NO_ENTREGADO',
  modulo: 'compras',
  async evaluar(config) {
    const hoy = hoyCero()

    const pedidos = await db.pedidoCompraExterno.findMany({
      where: {
        estado: {
          in: [
            EstadoPedidoCompra.APROBADO,
            EstadoPedidoCompra.COMPRADO,
            EstadoPedidoCompra.ENTREGADO_PARCIAL,
          ],
        },
        fechaNecesariaEnObra: { lt: hoy },
        fechaEntregaReal: null,
      },
      select: {
        id: true,
        numero: true,
        descripcion: true,
        proveedor: true,
        monto: true,
        estado: true,
        fechaNecesariaEnObra: true,
        fechaEntregaEstimada: true,
        obraId: true,
        obra: { select: { codigo: true, nombre: true } },
      },
    })

    return pedidos.map((p): Hallazgo => {
      const atraso = diasDesde(p.fechaNecesariaEnObra as Date)

      return {
        claveUnica: clave(config.codigo, 'PedidoCompraExterno', p.id),
        titulo: `Material que no llegó a ${p.obra.codigo}`,
        detalle: `${p.numero ? `${p.numero}: ` : ''}${p.descripcion}${
          p.proveedor ? ` (${p.proveedor})` : ''
        } tenía que estar en obra el ${fecha(p.fechaNecesariaEnObra)}: hace ${plural(
          atraso,
          'día',
        )}.${
          p.fechaEntregaEstimada
            ? ` El proveedor dice que entrega el ${fecha(p.fechaEntregaEstimada)}.`
            : ' El proveedor no dio fecha.'
        }`,
        entidadTipo: 'PedidoCompraExterno',
        entidadId: p.id,
        enlace: `/obras/${p.obraId}?pestana=compras`,
        obraId: p.obraId,
      }
    })
  },
}

/** El proveedor entrega después de la fecha en que se necesita. */
export const entregaPosteriorANecesidad: Regla = {
  codigo: 'ENTREGA_POSTERIOR_A_NECESIDAD',
  modulo: 'compras',
  async evaluar(config) {
    const hoy = hoyCero()

    const pedidos = await db.pedidoCompraExterno.findMany({
      where: {
        estado: {
          in: [EstadoPedidoCompra.APROBADO, EstadoPedidoCompra.COMPRADO],
        },
        fechaEntregaReal: null,
        fechaNecesariaEnObra: { gte: hoy },
        fechaEntregaEstimada: { not: null },
      },
      select: {
        id: true,
        numero: true,
        descripcion: true,
        proveedor: true,
        fechaNecesariaEnObra: true,
        fechaEntregaEstimada: true,
        obraId: true,
        obra: { select: { codigo: true } },
      },
    })

    return pedidos
      .filter(
        (p) =>
          (p.fechaEntregaEstimada as Date) > (p.fechaNecesariaEnObra as Date),
      )
      .map((p): Hallazgo => {
        const tarde = diasHasta(
          p.fechaEntregaEstimada as Date,
          p.fechaNecesariaEnObra as Date,
        )

        return {
          claveUnica: clave(config.codigo, 'PedidoCompraExterno', p.id),
          titulo: `Entrega tarde para ${p.obra.codigo}`,
          detalle: `${p.numero ? `${p.numero}: ` : ''}${p.descripcion}${
            p.proveedor ? ` (${p.proveedor})` : ''
          } se necesita el ${fecha(p.fechaNecesariaEnObra)} y el proveedor entrega el ${fecha(
            p.fechaEntregaEstimada,
          )}: ${plural(tarde, 'día')} tarde. Todavía se está a tiempo de reclamar o buscar otro.`,
          entidadTipo: 'PedidoCompraExterno',
          entidadId: p.id,
          enlace: `/obras/${p.obraId}?pestana=compras`,
          obraId: p.obraId,
        }
      })
  },
}

/** La sincronización con el sistema base falló o no corre. */
export const sincronizacionAtrasada: Regla = {
  codigo: 'SINCRONIZACION_ATRASADA',
  modulo: 'sistema',
  async evaluar(config) {
    const limite = haceHoras(config.umbral)

    const ultima = await db.registroSync.findFirst({
      orderBy: { inicio: 'desc' },
      select: { id: true, inicio: true, estado: true, error: true, fuente: true },
    })

    // Nunca corrió: eso también es un problema.
    if (!ultima) {
      return [
        {
          claveUnica: clave(config.codigo, 'Sistema', 'sincronizacion'),
          titulo: 'La sincronización nunca corrió',
          detalle:
            'Todavía no se trajo ningún dato del sistema base. El tablero va a estar incompleto hasta que corra la primera.',
          entidadTipo: 'Sistema',
          entidadId: 'sincronizacion',
          enlace: '/mas/sincronizacion',
        },
      ]
    }

    const atrasada = ultima.inicio < limite
    const fallo = ultima.estado === EstadoSync.ERROR

    if (!atrasada && !fallo) return []

    const horas = Math.round((Date.now() - ultima.inicio.getTime()) / 3_600_000)

    return [
      {
        claveUnica: clave(config.codigo, 'Sistema', 'sincronizacion'),
        titulo: fallo
          ? 'La sincronización con el sistema base falló'
          : 'La sincronización está atrasada',
        detalle: fallo
          ? `La última corrida (${fecha(ultima.inicio)}) terminó con error: ${ultima.error?.slice(0, 200) ?? 'sin detalle'}`
          : `La última sincronización fue hace ${plural(horas, 'hora')}. Un tablero con datos viejos es peor que no tener tablero.`,
        entidadTipo: 'Sistema',
        entidadId: 'sincronizacion',
        enlace: '/mas/sincronizacion',
      },
    ]
  },
}

export const reglasCompras: Regla[] = [
  pedidoSinAprobar,
  materialNoEntregado,
  entregaPosteriorANecesidad,
]

export const reglasSistema: Regla[] = [sincronizacionAtrasada]
