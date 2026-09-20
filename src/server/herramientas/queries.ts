import 'server-only'

import {
  Condicion,
  EstadoHerramienta,
  EstadoSolicitudHerramienta,
  Prisma,
  TipoControlHerramienta,
} from '@prisma/client'
import { db } from '@/lib/db'

/* =====================================================================
   Consultas del módulo de herramientas.

   Todo el módulo existe para contestar en segundos: ¿tenemos esto y
   dónde está? Las consultas están armadas para eso.
   ===================================================================== */

function hoyCero(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/* ---------------------------- RESUMEN ------------------------------- */

export interface ResumenHerramientas {
  total: number
  disponibles: number
  enObra: number
  enReparacion: number
  vencidas: number
  extraviadas: number
  deBaja: number
  valorTotal: number
}

export async function resumenHerramientas(): Promise<ResumenHerramientas> {
  const hoy = hoyCero()

  const [porEstado, vencidas, valor] = await Promise.all([
    db.herramienta.groupBy({
      by: ['estado'],
      where: { tipoControl: TipoControlHerramienta.UNITARIO },
      _count: true,
    }),
    db.herramienta.count({
      where: {
        estado: EstadoHerramienta.EN_OBRA,
        fechaDevolucionPrevista: { lt: hoy },
      },
    }),
    db.herramienta.aggregate({
      where: { estado: { not: EstadoHerramienta.BAJA } },
      _sum: { valorCompra: true },
    }),
  ])

  const cuenta = (estado: EstadoHerramienta) =>
    porEstado.find((p) => p.estado === estado)?._count ?? 0

  return {
    total: porEstado.reduce((a, p) => a + p._count, 0),
    disponibles: cuenta(EstadoHerramienta.DISPONIBLE),
    enObra: cuenta(EstadoHerramienta.EN_OBRA),
    enReparacion: cuenta(EstadoHerramienta.EN_REPARACION),
    extraviadas: cuenta(EstadoHerramienta.EXTRAVIADA),
    deBaja: cuenta(EstadoHerramienta.BAJA),
    vencidas,
    valorTotal: Number(valor._sum.valorCompra ?? 0),
  }
}

/* ---------------------------- LISTADO ------------------------------- */

export interface FiltrosHerramientas {
  busqueda?: string
  estado?: EstadoHerramienta
  categoriaId?: string
  depositoId?: string
  obraId?: string
  /** Solo las que tienen la devolución vencida. */
  vencidas?: boolean
  ubicacion?: 'deposito' | 'obra'
}

export interface HerramientaDeLista {
  id: string
  codigo: string
  nombre: string
  marca: string | null
  estado: EstadoHerramienta
  tipoControl: TipoControlHerramienta
  categoria: string
  ubicacion: string
  responsable: string | null
  fechaDevolucionPrevista: Date | null
  vencida: boolean
  diasDeAtraso: number
  stockTotal: number | null
}

export async function listarHerramientas(
  filtros: FiltrosHerramientas = {},
): Promise<HerramientaDeLista[]> {
  const hoy = hoyCero()
  const busqueda = filtros.busqueda?.trim()

  const where: Prisma.HerramientaWhereInput = {
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
    ...(filtros.depositoId ? { depositoId: filtros.depositoId } : {}),
    ...(filtros.obraId ? { obraId: filtros.obraId } : {}),
    ...(filtros.vencidas
      ? {
          estado: EstadoHerramienta.EN_OBRA,
          fechaDevolucionPrevista: { lt: hoy },
        }
      : {}),
    ...(filtros.ubicacion === 'deposito' ? { depositoId: { not: null } } : {}),
    ...(filtros.ubicacion === 'obra' ? { obraId: { not: null } } : {}),
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: 'insensitive' } },
            { codigo: { contains: busqueda, mode: 'insensitive' } },
            { marca: { contains: busqueda, mode: 'insensitive' } },
            { modelo: { contains: busqueda, mode: 'insensitive' } },
            { nroSerie: { contains: busqueda, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const herramientas = await db.herramienta.findMany({
    where,
    select: {
      id: true,
      codigo: true,
      nombre: true,
      marca: true,
      estado: true,
      tipoControl: true,
      fechaDevolucionPrevista: true,
      categoria: { select: { nombre: true } },
      deposito: { select: { nombre: true } },
      obra: { select: { codigo: true, nombre: true } },
      responsableActual: { select: { nombre: true, apellido: true } },
      existencias: { select: { cantidad: true } },
    },
    orderBy: [{ estado: 'asc' }, { codigo: 'asc' }],
  })

  return herramientas.map((h) => {
    const vencida =
      h.estado === EstadoHerramienta.EN_OBRA &&
      h.fechaDevolucionPrevista !== null &&
      h.fechaDevolucionPrevista < hoy

    return {
      id: h.id,
      codigo: h.codigo,
      nombre: h.nombre,
      marca: h.marca,
      estado: h.estado,
      tipoControl: h.tipoControl,
      categoria: h.categoria.nombre,
      ubicacion:
        h.tipoControl === TipoControlHerramienta.CANTIDAD
          ? 'Repartida'
          : (h.deposito?.nombre ??
            (h.obra ? `${h.obra.codigo} · ${h.obra.nombre}` : null) ??
            (h.estado === EstadoHerramienta.EN_REPARACION
              ? 'En el taller'
              : h.estado === EstadoHerramienta.EXTRAVIADA
                ? 'Sin ubicar'
                : 'Sin ubicación')),
      responsable: h.responsableActual
        ? `${h.responsableActual.nombre} ${h.responsableActual.apellido}`
        : null,
      fechaDevolucionPrevista: h.fechaDevolucionPrevista,
      vencida,
      diasDeAtraso:
        vencida && h.fechaDevolucionPrevista
          ? Math.round(
              (hoy.getTime() - h.fechaDevolucionPrevista.getTime()) / 86_400_000,
            )
          : 0,
      stockTotal:
        h.tipoControl === TipoControlHerramienta.CANTIDAD
          ? h.existencias.reduce((a, e) => a + e.cantidad, 0)
          : null,
    }
  })
}

/* ----------------------------- FICHA -------------------------------- */

export async function obtenerHerramienta(id: string) {
  return db.herramienta.findUnique({
    where: { id },
    include: {
      categoria: true,
      deposito: { select: { id: true, nombre: true } },
      obra: { select: { id: true, codigo: true, nombre: true, estado: true } },
      responsableActual: {
        select: { id: true, nombre: true, apellido: true, legajo: true },
      },
      existencias: {
        select: {
          id: true,
          cantidad: true,
          deposito: { select: { id: true, nombre: true } },
          obra: { select: { id: true, codigo: true, nombre: true } },
        },
      },
      mantenimientos: { orderBy: { fecha: 'desc' } },
      movimientos: {
        orderBy: { fecha: 'desc' },
        include: {
          origenDeposito: { select: { nombre: true } },
          origenObra: { select: { codigo: true, nombre: true } },
          destinoDeposito: { select: { nombre: true } },
          destinoObra: { select: { codigo: true, nombre: true } },
          registradoPor: { select: { nombre: true } },
          recibidoPor: { select: { nombre: true, apellido: true } },
        },
      },
    },
  })
}

export type HerramientaFicha = NonNullable<
  Awaited<ReturnType<typeof obtenerHerramienta>>
>

/** Busca por código exacto: lo que hace el escáner de QR. */
export async function buscarPorCodigo(codigo: string) {
  return db.herramienta.findUnique({
    where: { codigo: codigo.trim().toUpperCase() },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      tipoControl: true,
      obra: { select: { id: true, codigo: true, nombre: true } },
      deposito: { select: { id: true, nombre: true } },
      responsableActual: { select: { nombre: true, apellido: true } },
    },
  })
}

/* --------------------------- SOLICITUDES ---------------------------- */

export async function listarSolicitudes(estado?: EstadoSolicitudHerramienta) {
  return db.solicitudHerramienta.findMany({
    where: estado ? { estado } : {},
    include: {
      obra: { select: { id: true, codigo: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
      solicitante: { select: { nombre: true } },
      resueltaPor: { select: { nombre: true } },
      movimientos: {
        select: {
          herramienta: { select: { id: true, codigo: true, nombre: true } },
        },
      },
    },
    orderBy: [{ estado: 'asc' }, { prioridad: 'desc' }, { fechaNecesaria: 'asc' }],
  })
}

export async function obtenerSolicitud(id: string) {
  return db.solicitudHerramienta.findUnique({
    where: { id },
    include: {
      obra: { select: { id: true, codigo: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
      solicitante: { select: { nombre: true } },
      resueltaPor: { select: { nombre: true } },
      movimientos: {
        select: {
          herramienta: { select: { id: true, codigo: true, nombre: true } },
        },
      },
    },
  })
}

/**
 * Lo que el pañolero necesita ver al abrir una solicitud: qué hay
 * disponible de esa categoría, y qué está en obras que ya terminaron o
 * que lo tienen hace mucho sin moverse.
 *
 * Este es el freno a las compras duplicadas: antes de derivar a compra,
 * el sistema muestra lo que la empresa YA tiene.
 */
export async function candidatasParaSolicitud(
  categoriaId: string | null,
  obraSolicitante: string,
) {
  const hace45Dias = new Date()
  hace45Dias.setDate(hace45Dias.getDate() - 45)

  const base: Prisma.HerramientaWhereInput = {
    tipoControl: TipoControlHerramienta.UNITARIO,
    ...(categoriaId ? { categoriaId } : {}),
  }

  const [enDeposito, enObrasInactivas, sinMovimiento, porCantidad] =
    await Promise.all([
      // 1. Lo que está libre en un depósito: se entrega hoy mismo.
      db.herramienta.findMany({
        where: { ...base, estado: EstadoHerramienta.DISPONIBLE },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          marca: true,
          condicion: true,
          valorCompra: true,
          deposito: { select: { nombre: true } },
        },
        orderBy: { codigo: 'asc' },
      }),

      // 2. Lo que quedó en obras finalizadas o pausadas.
      db.herramienta.findMany({
        where: {
          ...base,
          estado: EstadoHerramienta.EN_OBRA,
          obra: { estado: { in: ['FINALIZADA', 'PAUSADA'] } },
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          marca: true,
          condicion: true,
          valorCompra: true,
          fechaDevolucionPrevista: true,
          obra: { select: { id: true, codigo: true, nombre: true, estado: true } },
          responsableActual: { select: { nombre: true, apellido: true } },
        },
        orderBy: { codigo: 'asc' },
      }),

      // 3. Lo que está en otra obra hace más de 45 días sin moverse.
      db.herramienta.findMany({
        where: {
          ...base,
          estado: EstadoHerramienta.EN_OBRA,
          obra: { estado: 'EN_CURSO' },
          obraId: { not: obraSolicitante },
          movimientos: { every: { fecha: { lt: hace45Dias } } },
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          marca: true,
          condicion: true,
          valorCompra: true,
          fechaDevolucionPrevista: true,
          obra: { select: { id: true, codigo: true, nombre: true, estado: true } },
          responsableActual: { select: { nombre: true, apellido: true } },
        },
        orderBy: { codigo: 'asc' },
        take: 10,
      }),

      // 4. Existencias por cantidad de esa categoría.
      db.existenciaHerramienta.findMany({
        where: {
          cantidad: { gt: 0 },
          depositoId: { not: null },
          herramienta: {
            tipoControl: TipoControlHerramienta.CANTIDAD,
            ...(categoriaId ? { categoriaId } : {}),
          },
        },
        select: {
          id: true,
          cantidad: true,
          herramienta: { select: { id: true, codigo: true, nombre: true } },
          deposito: { select: { id: true, nombre: true } },
        },
      }),
    ])

  return { enDeposito, enObrasInactivas, sinMovimiento, porCantidad }
}

/* -------------------------- MANTENIMIENTO --------------------------- */

export async function mantenimientosPendientes() {
  const hoy = hoyCero()
  const en30Dias = new Date(hoy)
  en30Dias.setDate(en30Dias.getDate() + 30)

  const [vencidos, proximos] = await Promise.all([
    db.herramienta.findMany({
      where: {
        proximoMantenimiento: { lt: hoy },
        estado: { not: EstadoHerramienta.BAJA },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        proximoMantenimiento: true,
        estado: true,
      },
      orderBy: { proximoMantenimiento: 'asc' },
    }),
    db.herramienta.findMany({
      where: {
        proximoMantenimiento: { gte: hoy, lte: en30Dias },
        estado: { not: EstadoHerramienta.BAJA },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        proximoMantenimiento: true,
        estado: true,
      },
      orderBy: { proximoMantenimiento: 'asc' },
    }),
  ])

  return { vencidos, proximos }
}

/* ---------------------------- UBICACIONES --------------------------- */

export interface Ubicacion {
  id: string
  nombre: string
  tipo: 'deposito' | 'obra'
  /** Solo para obras. */
  estadoObra?: string
  cantidad: number
  valor: number
  vencidas: number
  /** Obra finalizada o pausada que todavía tiene herramientas. */
  destacada: boolean
}

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const hoy = hoyCero()

  const [depositos, obras] = await Promise.all([
    db.deposito.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        herramientas: {
          where: { estado: { not: EstadoHerramienta.BAJA } },
          select: { valorCompra: true },
        },
      },
    }),
    db.obra.findMany({
      where: { herramientas: { some: { estado: EstadoHerramienta.EN_OBRA } } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        herramientas: {
          where: { estado: EstadoHerramienta.EN_OBRA },
          select: { valorCompra: true, fechaDevolucionPrevista: true },
        },
      },
    }),
  ])

  const salida: Ubicacion[] = [
    ...depositos.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: 'deposito' as const,
      cantidad: d.herramientas.length,
      valor: d.herramientas.reduce((a, h) => a + Number(h.valorCompra ?? 0), 0),
      vencidas: 0,
      destacada: false,
    })),
    ...obras.map((o) => ({
      id: o.id,
      nombre: `${o.codigo} · ${o.nombre}`,
      tipo: 'obra' as const,
      estadoObra: o.estado,
      cantidad: o.herramientas.length,
      valor: o.herramientas.reduce((a, h) => a + Number(h.valorCompra ?? 0), 0),
      vencidas: o.herramientas.filter(
        (h) => h.fechaDevolucionPrevista !== null && h.fechaDevolucionPrevista < hoy,
      ).length,
      // Las obras que terminaron o están pausadas y todavía tienen
      // herramientas van arriba de todo: es plata parada.
      destacada: o.estado === 'FINALIZADA' || o.estado === 'PAUSADA',
    })),
  ]

  return salida.sort((a, b) => {
    if (a.destacada !== b.destacada) return a.destacada ? -1 : 1
    return b.valor - a.valor
  })
}

/* ------------------------- LISTAS AUXILIARES ------------------------ */

export async function categorias() {
  return db.categoriaHerramienta.findMany({
    select: { id: true, nombre: true, _count: { select: { herramientas: true } } },
    orderBy: { nombre: 'asc' },
  })
}

export async function depositosActivos() {
  return db.deposito.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  })
}

export async function obrasAbiertas() {
  return db.obra.findMany({
    where: { estado: { in: ['EN_CURSO', 'PLANIFICADA', 'PAUSADA'] } },
    select: { id: true, codigo: true, nombre: true },
    orderBy: { codigo: 'desc' },
  })
}

export async function empleadosActivos() {
  return db.empleado.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, apellido: true, legajo: true },
    orderBy: { apellido: 'asc' },
  })
}

/** El siguiente código libre: SIG-H-0129 si el último es el 0128. */
export async function siguienteCodigo(): Promise<string> {
  const ultima = await db.herramienta.findFirst({
    where: { codigo: { startsWith: 'SIG-H-' } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true },
  })

  const numero = ultima ? Number(ultima.codigo.replace('SIG-H-', '')) + 1 : 1
  return `SIG-H-${String(numero).padStart(4, '0')}`
}

export const CONDICIONES: Array<{ valor: Condicion; texto: string }> = [
  { valor: 'BUENA', texto: 'Buena' },
  { valor: 'REGULAR', texto: 'Regular' },
  { valor: 'MALA', texto: 'Mala' },
]
