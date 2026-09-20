import 'server-only'

import { EstadoSync, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sistemaBase } from './index'
import { ErrorIntegracion } from './tipos'
import type { FuenteSistemaBase, SistemaBase } from './tipos'

/* =====================================================================
   Sincronización con el sistema base.

   Dos reglas que no se negocian:

   1. NUNCA se pisa un campo nuestro. El sistema base manda sobre el
      código, el nombre, el cliente, el estado y el presupuesto total.
      El jefe de obra, el presupuesto de mano de obra, la ubicación y si
      la obra es del interior son de esta app, y la sincronización no los
      toca aunque el proveedor mande algo.

   2. NUNCA queda un RegistroSync colgado en "en curso". Pase lo que
      pase, el registro se cierra: con las cantidades o con el error.
   ===================================================================== */

export interface ResultadoSync {
  ok: boolean
  registroId: string
  fuente: FuenteSistemaBase
  obras: number
  movimientos: number
  pedidos: number
  /** Cuánto tardó, en milisegundos. */
  duracion: number
  /**
   * Cosas que hay que mirar pero que no frenaron la corrida: códigos de
   * obra que no existen, categorías sin mapear, filas incompletas.
   */
  advertencias: string[]
  error?: string
}

/** Desde cuándo pedir datos: la última corrida exitosa, con un solapamiento. */
async function desdeCuando(fuente: FuenteSistemaBase): Promise<Date> {
  const ultima = await db.registroSync.findFirst({
    where: { fuente, estado: EstadoSync.OK },
    orderBy: { inicio: 'desc' },
    select: { inicio: true },
  })

  if (!ultima) {
    // Primera corrida: se trae el último año.
    const hace1Anio = new Date()
    hace1Anio.setFullYear(hace1Anio.getFullYear() - 1)
    return hace1Anio
  }

  // Un día de solapamiento a propósito: si el proveedor carga con fecha
  // retroactiva, igual lo levantamos. El upsert se encarga de no duplicar.
  const desde = new Date(ultima.inicio)
  desde.setDate(desde.getDate() - 1)
  return desde
}

/**
 * Corre una sincronización completa.
 * Nunca lanza: los errores vuelven dentro del resultado, porque quien la
 * llama (un cron o un botón) necesita saber qué pasó, no reventar.
 *
 * `adaptadorForzado` sirve para probar una conexión antes de dejarla
 * configurada, y para las pruebas, que necesitan simular que el
 * proveedor se cae.
 */
export async function sincronizar(
  fuenteForzada?: FuenteSistemaBase,
  adaptadorForzado?: SistemaBase,
): Promise<ResultadoSync> {
  const arranque = Date.now()

  let fuente: FuenteSistemaBase
  let adaptador: SistemaBase
  try {
    adaptador = adaptadorForzado ?? sistemaBase(fuenteForzada)
    fuente = adaptador.fuente
  } catch (error) {
    // Ni siquiera se pudo elegir el adaptador: se deja constancia igual.
    const mensaje = mensajeDeError(error)
    const registro = await db.registroSync.create({
      data: {
        fuente: 'desconocido',
        estado: EstadoSync.ERROR,
        fin: new Date(),
        error: mensaje,
      },
    })
    return {
      ok: false,
      registroId: registro.id,
      fuente: 'mock',
      obras: 0,
      movimientos: 0,
      pedidos: 0,
      duracion: Date.now() - arranque,
      advertencias: [],
      error: mensaje,
    }
  }

  const registro = await db.registroSync.create({
    data: { fuente, estado: EstadoSync.EN_CURSO },
  })

  const advertencias: string[] = []
  let obras = 0
  let movimientos = 0
  let pedidos = 0

  try {
    const desde = await desdeCuando(fuente)

    obras = await sincronizarObras(adaptador, advertencias)
    movimientos = await sincronizarMovimientos(adaptador, desde, advertencias)
    pedidos = await sincronizarPedidos(adaptador, desde, advertencias)

    // Advertencias propias del adaptador (Sorby las junta al leer).
    const propias = (
      adaptador as { obtenerAdvertencias?: () => string[] }
    ).obtenerAdvertencias?.()
    if (propias) advertencias.push(...propias)

    await db.registroSync.update({
      where: { id: registro.id },
      data: {
        estado: EstadoSync.OK,
        fin: new Date(),
        obras,
        movimientos,
        pedidos,
        // Las advertencias se guardan en el mismo campo: si la corrida
        // salió bien pero algo hay que mirar, queda registrado.
        error: advertencias.length > 0 ? advertencias.join('\n') : null,
      },
    })

    return {
      ok: true,
      registroId: registro.id,
      fuente,
      obras,
      movimientos,
      pedidos,
      duracion: Date.now() - arranque,
      advertencias,
    }
  } catch (error) {
    const mensaje = mensajeDeError(error)

    // Esto es lo que garantiza que el registro nunca quede en EN_CURSO.
    await db.registroSync
      .update({
        where: { id: registro.id },
        data: {
          estado: EstadoSync.ERROR,
          fin: new Date(),
          obras,
          movimientos,
          pedidos,
          error: mensaje,
        },
      })
      .catch(() => {
        // Si ni siquiera se puede escribir el error, no hay nada más que
        // hacer: al menos no se tapa el error original.
        console.error('[sync] no se pudo cerrar el registro', registro.id)
      })

    return {
      ok: false,
      registroId: registro.id,
      fuente,
      obras,
      movimientos,
      pedidos,
      duracion: Date.now() - arranque,
      advertencias,
      error: mensaje,
    }
  }
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorIntegracion) return error.textoCompleto
  if (error instanceof Error) return error.message
  return String(error)
}

/* ============================= OBRAS ================================ */

async function sincronizarObras(
  adaptador: SistemaBase,
  advertencias: string[],
): Promise<number> {
  const externas = await adaptador.listarObras()
  if (externas.length === 0) return 0

  // Las unidades de negocio existentes, para resolver la que manda el
  // proveedor sin hacer una consulta por obra.
  const unidades = await db.unidadNegocio.findMany({
    select: { id: true, codigo: true, nombre: true },
  })
  const porNombre = new Map(
    unidades.flatMap((u) => [
      [normalizar(u.nombre), u.id],
      [normalizar(u.codigo), u.id],
    ]),
  )
  const unidadPorDefecto = unidades[0]?.id

  if (!unidadPorDefecto) {
    throw new ErrorIntegracion(
      adaptador.fuente,
      'No hay ninguna unidad de negocio cargada.',
      'Cargá al menos una unidad de negocio antes de sincronizar.',
    )
  }

  let contador = 0

  for (const externa of externas) {
    const unidadId = externa.unidadNegocio
      ? porNombre.get(normalizar(externa.unidadNegocio))
      : undefined

    if (externa.unidadNegocio && !unidadId) {
      advertencias.push(
        `La obra ${externa.codigo} vino con la unidad de negocio "${externa.unidadNegocio}", que no existe. Quedó en "${unidades[0].nombre}".`,
      )
    }

    /*
     * Solo los campos del sistema base. Fijate que acá NO están
     * jefeObraId, presupuestoManoObra, direccion, localidad, latitud,
     * longitud ni esInterior: esos son nuestros y se editan en la app.
     */
    const delSistemaBase = {
      codigo: externa.codigo,
      nombre: externa.nombre,
      tipo: externa.tipo,
      estado: externa.estado,
      cliente: externa.cliente,
      presupuestoTotal:
        externa.presupuestoTotal !== null
          ? new Prisma.Decimal(externa.presupuestoTotal.toFixed(2))
          : null,
      moneda: externa.moneda,
      fechaInicio: externa.fechaInicio,
      fechaFinPrevista: externa.fechaFinPrevista,
      fechaFinReal: externa.fechaFinReal,
      origen: 'SISTEMA_BASE' as const,
      idExterno: externa.idExterno,
      ultimaSync: new Date(),
    }

    // El código es la clave compartida: es por ahí que se busca la obra,
    // no por idExterno, porque una obra pudo haberse cargado a mano acá
    // antes de existir en el sistema base.
    const existente = await db.obra.findUnique({
      where: { codigo: externa.codigo },
      select: { id: true },
    })

    if (existente) {
      await db.obra.update({
        where: { id: existente.id },
        data: delSistemaBase,
      })
    } else {
      await db.obra.create({
        data: {
          ...delSistemaBase,
          unidadNegocioId: unidadId ?? unidadPorDefecto,
        },
      })
    }

    contador += 1
  }

  return contador
}

/* ========================== MOVIMIENTOS ============================= */

async function sincronizarMovimientos(
  adaptador: SistemaBase,
  desde: Date,
  advertencias: string[],
): Promise<number> {
  const externos = await adaptador.listarMovimientos(desde)
  if (externos.length === 0) return 0

  const obras = await db.obra.findMany({ select: { id: true, codigo: true } })
  const obraPorCodigo = new Map(obras.map((o) => [normalizar(o.codigo), o.id]))

  const sinObra = new Set<string>()
  let contador = 0

  for (const m of externos) {
    let obraId: string | null = null

    if (m.codigoObra) {
      obraId = obraPorCodigo.get(normalizar(m.codigoObra)) ?? null
      // Regla del prompt: si el código de obra no existe, el movimiento
      // NO se descarta. Se guarda sin obra y se informa.
      if (!obraId) sinObra.add(m.codigoObra)
    }

    const datos = {
      tipo: m.tipo,
      categoria: m.categoria,
      fecha: m.fecha,
      descripcion: m.descripcion,
      proveedor: m.proveedor,
      monto: new Prisma.Decimal(m.monto.toFixed(2)),
      moneda: m.moneda,
      tipoCambio:
        m.tipoCambio !== null ? new Prisma.Decimal(m.tipoCambio.toFixed(2)) : null,
      obraId,
    }

    await db.movimientoExterno.upsert({
      where: {
        fuente_idExterno: { fuente: adaptador.fuente, idExterno: m.idExterno },
      },
      create: { ...datos, fuente: adaptador.fuente, idExterno: m.idExterno },
      update: datos,
    })

    contador += 1
  }

  if (sinObra.size > 0) {
    advertencias.push(
      `Se guardaron movimientos sin obra porque estos códigos no existen en el sistema: ${[...sinObra].join(', ')}. Creá esas obras y volvé a sincronizar para que queden imputados.`,
    )
  }

  return contador
}

/* ============================ PEDIDOS =============================== */

async function sincronizarPedidos(
  adaptador: SistemaBase,
  desde: Date,
  advertencias: string[],
): Promise<number> {
  const externos = await adaptador.listarPedidosCompra(desde)
  if (externos.length === 0) return 0

  const obras = await db.obra.findMany({ select: { id: true, codigo: true } })
  const obraPorCodigo = new Map(obras.map((o) => [normalizar(o.codigo), o.id]))

  const sinObra = new Set<string>()
  let contador = 0

  for (const p of externos) {
    const obraId = obraPorCodigo.get(normalizar(p.codigoObra))

    // Un pedido SÍ necesita obra: el schema la exige y un pedido de
    // compra sin obra no significa nada. Se informa y se sigue.
    if (!obraId) {
      sinObra.add(p.codigoObra)
      continue
    }

    const datos = {
      numero: p.numero,
      descripcion: p.descripcion,
      solicitante: p.solicitante,
      proveedor: p.proveedor,
      estado: p.estado,
      monto: p.monto !== null ? new Prisma.Decimal(p.monto.toFixed(2)) : null,
      moneda: p.moneda,
      fechaSolicitud: p.fechaSolicitud,
      fechaNecesariaEnObra: p.fechaNecesariaEnObra,
      fechaAprobacion: p.fechaAprobacion,
      fechaEntregaEstimada: p.fechaEntregaEstimada,
      fechaEntregaReal: p.fechaEntregaReal,
      obraId,
    }

    await db.pedidoCompraExterno.upsert({
      where: {
        fuente_idExterno: { fuente: adaptador.fuente, idExterno: p.idExterno },
      },
      create: { ...datos, fuente: adaptador.fuente, idExterno: p.idExterno },
      update: datos,
    })

    contador += 1
  }

  if (sinObra.size > 0) {
    advertencias.push(
      `Se saltearon pedidos de compra de obras que no existen: ${[...sinObra].join(', ')}.`,
    )
  }

  return contador
}

/* ---------------------------------------------------------------------
   Los códigos de obra vienen con espacios de más, en minúscula o con
   guiones distintos según quién los haya escrito.
   --------------------------------------------------------------------- */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim()
}
