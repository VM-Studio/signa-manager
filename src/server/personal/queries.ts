import 'server-only'

import {
  Asistencia,
  CategoriaLaboral,
  EstadoParte,
  EstadoQuincena,
  Prisma,
} from '@prisma/client'
import { db } from '@/lib/db'
import type { Sesion } from '@/lib/auth/token'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { HORAS_POR_ASISTENCIA, diasHabilesEntre, quincenaDe } from './reglas'

function hoyCero(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/* ---------------------------- EMPLEADOS ----------------------------- */

export interface FiltrosEmpleados {
  busqueda?: string
  categoria?: CategoriaLaboral
  obraId?: string
  soloActivos?: boolean
  documentacion?: 'vencida' | 'por-vencer'
}

export async function listarEmpleados(filtros: FiltrosEmpleados = {}) {
  const hoy = hoyCero()
  const ahora = new Date()
  const busqueda = filtros.busqueda?.trim()

  const where: Prisma.EmpleadoWhereInput = {
    ...(filtros.soloActivos !== false ? { activo: true } : {}),
    ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
    ...(filtros.documentacion === 'vencida'
      ? { documentos: { some: { vencimiento: { lt: hoy } } } }
      : {}),
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: 'insensitive' } },
            { apellido: { contains: busqueda, mode: 'insensitive' } },
            { legajo: { contains: busqueda, mode: 'insensitive' } },
            { dni: { contains: busqueda } },
            { especialidad: { contains: busqueda, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const empleados = await db.empleado.findMany({
    where,
    select: {
      id: true,
      legajo: true,
      nombre: true,
      apellido: true,
      categoria: true,
      especialidad: true,
      valorHora: true,
      activo: true,
      asignaciones: {
        where: {
          desde: { lte: ahora },
          OR: [{ hasta: null }, { hasta: { gte: ahora } }],
        },
        select: { obra: { select: { id: true, codigo: true, nombre: true } } },
        take: 1,
      },
      documentos: {
        where: { vencimiento: { lte: hoy } },
        select: { id: true },
      },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  })

  return empleados
    .filter((e) =>
      filtros.obraId
        ? e.asignaciones.some((a) => a.obra.id === filtros.obraId)
        : true,
    )
    .map((e) => ({
      id: e.id,
      legajo: e.legajo,
      nombre: e.nombre,
      apellido: e.apellido,
      categoria: e.categoria,
      especialidad: e.especialidad,
      valorHora: Number(e.valorHora),
      activo: e.activo,
      obra: e.asignaciones[0]?.obra ?? null,
      documentosVencidos: e.documentos.length,
    }))
}

export async function obtenerEmpleado(id: string) {
  return db.empleado.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, email: true, rol: true } },
      documentos: { orderBy: { vencimiento: 'asc' } },
      entregasEpp: { orderBy: { fecha: 'desc' } },
      historialValorHora: { orderBy: { desde: 'desc' } },
      cuadrillas: {
        include: {
          cuadrilla: {
            select: {
              id: true,
              nombre: true,
              capataz: { select: { nombre: true, apellido: true } },
            },
          },
        },
      },
      asignaciones: {
        include: { obra: { select: { id: true, codigo: true, nombre: true, estado: true } } },
        orderBy: { desde: 'desc' },
      },
      novedades: {
        include: { obra: { select: { codigo: true } } },
        orderBy: { fecha: 'desc' },
        take: 20,
      },
      pagos: { orderBy: { fecha: 'desc' }, take: 20 },
      herramientasACargo: {
        where: { estado: 'EN_OBRA' },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          fechaDevolucionPrevista: true,
        },
      },
    },
  })
}

export type EmpleadoFicha = NonNullable<
  Awaited<ReturnType<typeof obtenerEmpleado>>
>

/** Asistencia del mes de un empleado, para el calendario de su ficha. */
export async function asistenciaDelMes(
  empleadoId: string,
  anio: number,
  mes: number,
) {
  const desde = new Date(anio, mes - 1, 1)
  const hasta = new Date(anio, mes, 0)
  hasta.setHours(23, 59, 59, 999)

  const lineas = await db.parteDiarioLinea.findMany({
    where: { empleadoId, parte: { fecha: { gte: desde, lte: hasta } } },
    select: {
      asistencia: true,
      horasNormales: true,
      horasExtra50: true,
      horasExtra100: true,
      costoCalculado: true,
      parte: {
        select: {
          fecha: true,
          estado: true,
          obra: { select: { codigo: true, nombre: true } },
        },
      },
    },
    orderBy: { parte: { fecha: 'asc' } },
  })

  const dias = lineas.map((l) => ({
    fecha: l.parte.fecha,
    asistencia: l.asistencia,
    horas:
      Number(l.horasNormales) + Number(l.horasExtra50) + Number(l.horasExtra100),
    horasNormales: Number(l.horasNormales),
    horasExtra50: Number(l.horasExtra50),
    horasExtra100: Number(l.horasExtra100),
    costo: Number(l.costoCalculado ?? 0),
    obra: l.parte.obra.codigo,
    aprobado: l.parte.estado === EstadoParte.APROBADO,
  }))

  const totales = dias.reduce(
    (a, d) => ({
      horasNormales: a.horasNormales + d.horasNormales,
      horasExtra50: a.horasExtra50 + d.horasExtra50,
      horasExtra100: a.horasExtra100 + d.horasExtra100,
      costo: a.costo + d.costo,
      presentes:
        a.presentes +
        (d.asistencia === Asistencia.PRESENTE ||
        d.asistencia === Asistencia.MEDIA_JORNADA
          ? 1
          : 0),
      ausencias:
        a.ausencias +
        (d.asistencia === Asistencia.AUSENTE_CON_AVISO ||
        d.asistencia === Asistencia.AUSENTE_SIN_AVISO
          ? 1
          : 0),
    }),
    { horasNormales: 0, horasExtra50: 0, horasExtra100: 0, costo: 0, presentes: 0, ausencias: 0 },
  )

  return { dias, totales }
}

/* ------------------------- SUBCONTRATISTAS -------------------------- */

export async function listarSubcontratistas() {
  const hoy = hoyCero()

  const subcontratistas = await db.subcontratista.findMany({
    where: { activo: true },
    select: {
      id: true,
      razonSocial: true,
      rubro: true,
      contacto: true,
      telefono: true,
      documentos: { select: { id: true, vencimiento: true } },
      asignaciones: {
        where: { OR: [{ hasta: null }, { hasta: { gte: hoy } }] },
        select: { obra: { select: { codigo: true } } },
      },
    },
    orderBy: { razonSocial: 'asc' },
  })

  return subcontratistas.map((s) => ({
    id: s.id,
    razonSocial: s.razonSocial,
    rubro: s.rubro,
    contacto: s.contacto,
    telefono: s.telefono,
    documentosVencidos: s.documentos.filter(
      (d) => d.vencimiento !== null && d.vencimiento < hoy,
    ).length,
    obras: s.asignaciones.map((a) => a.obra.codigo),
  }))
}

export async function obtenerSubcontratista(id: string) {
  const hoy = hoyCero()
  const hace7dias = new Date(hoy)
  hace7dias.setDate(hace7dias.getDate() - 7)

  const [subcontratista, presenciasRecientes] = await Promise.all([
    db.subcontratista.findUnique({
      where: { id },
      include: {
        documentos: { orderBy: { vencimiento: 'asc' } },
        asignaciones: {
          include: { obra: { select: { id: true, codigo: true, nombre: true } } },
          orderBy: { desde: 'desc' },
        },
        pagos: { orderBy: { fecha: 'desc' }, take: 20 },
        presencias: {
          include: {
            parte: {
              select: { fecha: true, obra: { select: { codigo: true } } },
            },
          },
          orderBy: { parte: { fecha: 'desc' } },
          take: 30,
        },
      },
    }),
    db.parteSubcontratista.count({
      where: { subcontratistaId: id, parte: { fecha: { gte: hace7dias } } },
    }),
  ])

  if (!subcontratista) return null

  return {
    ...subcontratista,
    presenciasRecientes,
    documentosVencidos: subcontratista.documentos.filter(
      (d) => d.vencimiento !== null && d.vencimiento < hoy,
    ),
  }
}

/* ----------------------------- CUADRILLAS --------------------------- */

export async function listarCuadrillas() {
  const ahora = new Date()

  return db.cuadrilla.findMany({
    where: { activa: true },
    select: {
      id: true,
      nombre: true,
      capataz: { select: { id: true, nombre: true, apellido: true } },
      miembros: {
        select: {
          id: true,
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              legajo: true,
              categoria: true,
            },
          },
        },
      },
      asignaciones: {
        where: { OR: [{ hasta: null }, { hasta: { gte: ahora } }] },
        select: { obra: { select: { id: true, codigo: true, nombre: true } } },
        take: 1,
      },
    },
    orderBy: { nombre: 'asc' },
  })
}

/* --------------------------- PLANIFICACIÓN -------------------------- */

export async function planificacionSemanal(
  sesion: Sesion,
  desde: Date,
  hasta: Date,
) {
  const obraIds = await obrasDeLaSesion(sesion)

  const [obras, asignaciones, sinAsignar] = await Promise.all([
    db.obra.findMany({
      where: {
        ...(obraIds === null ? {} : { id: { in: obraIds } }),
        estado: { in: ['EN_CURSO', 'PLANIFICADA'] },
      },
      select: { id: true, codigo: true, nombre: true, esInterior: true },
      orderBy: { codigo: 'desc' },
    }),
    db.asignacionObra.findMany({
      where: {
        ...(obraIds === null ? {} : { obraId: { in: obraIds } }),
        desde: { lte: hasta },
        OR: [{ hasta: null }, { hasta: { gte: desde } }],
      },
      select: {
        id: true,
        desde: true,
        hasta: true,
        tarea: true,
        obraId: true,
        empleado: {
          select: { id: true, nombre: true, apellido: true, legajo: true, categoria: true },
        },
        cuadrilla: {
          select: {
            id: true,
            nombre: true,
            _count: { select: { miembros: true } },
          },
        },
        subcontratista: { select: { id: true, razonSocial: true, rubro: true } },
      },
    }),
    // Empleados activos sin ninguna asignación vigente esta semana.
    db.empleado.findMany({
      where: {
        activo: true,
        asignaciones: {
          none: {
            desde: { lte: hasta },
            OR: [{ hasta: null }, { hasta: { gte: desde } }],
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        legajo: true,
        categoria: true,
      },
      orderBy: { apellido: 'asc' },
    }),
  ])

  // Quién está en dos obras en el mismo período.
  const porEmpleado = new Map<string, string[]>()
  for (const a of asignaciones) {
    if (!a.empleado) continue
    const lista = porEmpleado.get(a.empleado.id) ?? []
    lista.push(a.obraId)
    porEmpleado.set(a.empleado.id, lista)
  }
  const superpuestos = [...porEmpleado.entries()]
    .filter(([, obras]) => new Set(obras).size > 1)
    .map(([empleadoId]) => empleadoId)

  return { obras, asignaciones, sinAsignar, superpuestos }
}

/* ------------------------------ PARTES ------------------------------ */

/**
 * Todo lo que hace falta para abrir el parte de una obra en una fecha.
 * Si ya existe, trae sus líneas; si no, arma la lista con todos los
 * asignados como presentes con 8 horas, que es la regla del prompt.
 */
export async function armarParte(obraId: string, fecha: Date) {
  const [obra, existente, asignados, subcontratistas] = await Promise.all([
    db.obra.findUnique({
      where: { id: obraId },
      select: { id: true, codigo: true, nombre: true, estado: true, esInterior: true },
    }),
    db.parteDiario.findUnique({
      where: { obraId_fecha: { obraId, fecha } },
      include: {
        lineas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                legajo: true,
                categoria: true,
                especialidad: true,
              },
            },
          },
        },
        subcontratistas: {
          include: { subcontratista: { select: { id: true, razonSocial: true } } },
        },
        cargadoPor: { select: { nombre: true } },
        aprobadoPor: { select: { nombre: true } },
      },
    }),
    db.asignacionObra.findMany({
      where: {
        obraId,
        empleadoId: { not: null },
        desde: { lte: fecha },
        OR: [{ hasta: null }, { hasta: { gte: fecha } }],
      },
      select: {
        tarea: true,
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            legajo: true,
            categoria: true,
            especialidad: true,
          },
        },
      },
    }),
    db.subcontratista.findMany({
      where: { activo: true },
      select: { id: true, razonSocial: true, rubro: true },
      orderBy: { razonSocial: 'asc' },
    }),
  ])

  if (!obra) return null

  // Los que ya están en el parte guardado.
  const enElParte = new Map(
    (existente?.lineas ?? []).map((l) => [l.empleadoId, l]),
  )

  const personas = new Map<
    string,
    {
      id: string
      nombre: string
      apellido: string
      legajo: string
      categoria: string
      especialidad: string | null
      asistencia: Asistencia
      horasNormales: number
      horasExtra50: number
      horasExtra100: number
      tarea: string | null
      asignado: boolean
    }
  >()

  // 1. Los asignados, como presentes con 8 horas.
  for (const a of asignados) {
    if (!a.empleado) continue
    const guardado = enElParte.get(a.empleado.id)
    personas.set(a.empleado.id, {
      ...a.empleado,
      asistencia: guardado?.asistencia ?? Asistencia.PRESENTE,
      horasNormales: guardado
        ? Number(guardado.horasNormales)
        : HORAS_POR_ASISTENCIA.PRESENTE,
      horasExtra50: guardado ? Number(guardado.horasExtra50) : 0,
      horasExtra100: guardado ? Number(guardado.horasExtra100) : 0,
      tarea: guardado?.tarea ?? a.tarea ?? null,
      asignado: true,
    })
  }

  // 2. Los que el capataz agregó a mano y no están asignados.
  for (const l of existente?.lineas ?? []) {
    if (personas.has(l.empleadoId)) continue
    personas.set(l.empleadoId, {
      ...l.empleado,
      asistencia: l.asistencia,
      horasNormales: Number(l.horasNormales),
      horasExtra50: Number(l.horasExtra50),
      horasExtra100: Number(l.horasExtra100),
      tarea: l.tarea,
      asignado: false,
    })
  }

  return {
    obra,
    fecha,
    existe: existente !== null,
    parteId: existente?.id ?? null,
    estado: existente?.estado ?? EstadoParte.BORRADOR,
    clima: existente?.clima ?? 'DESPEJADO',
    tareasDelDia: existente?.tareasDelDia ?? null,
    observaciones: existente?.observaciones ?? null,
    cargadoPor: existente?.cargadoPor?.nombre ?? null,
    aprobadoPor: existente?.aprobadoPor?.nombre ?? null,
    personas: [...personas.values()].sort((a, b) =>
      a.apellido.localeCompare(b.apellido),
    ),
    subcontratistasDelDia: (existente?.subcontratistas ?? []).map((s) => ({
      subcontratistaId: s.subcontratistaId,
      razonSocial: s.subcontratista.razonSocial,
      cantidadPersonas: s.cantidadPersonas,
      tarea: s.tarea,
    })),
    subcontratistasDisponibles: subcontratistas,
  }
}

export type ParteArmado = NonNullable<Awaited<ReturnType<typeof armarParte>>>

/** Los partes para la bandeja de aprobación del jefe de obra. */
export async function partesParaAprobar(sesion: Sesion) {
  const obraIds = await obrasDeLaSesion(sesion)

  return db.parteDiario.findMany({
    where: {
      ...(obraIds === null ? {} : { obraId: { in: obraIds } }),
      estado: EstadoParte.ENVIADO,
    },
    select: {
      id: true,
      fecha: true,
      clima: true,
      enviadoEn: true,
      obra: { select: { id: true, codigo: true, nombre: true } },
      cargadoPor: { select: { nombre: true } },
      _count: { select: { lineas: true } },
      lineas: {
        select: {
          asistencia: true,
          horasNormales: true,
          horasExtra50: true,
          horasExtra100: true,
        },
      },
    },
    orderBy: { fecha: 'asc' },
  })
}

/** Calendario de partes de una obra en un mes: qué días hay y cuáles faltan. */
export async function calendarioDePartes(
  obraId: string,
  anio: number,
  mes: number,
) {
  const desde = new Date(anio, mes - 1, 1)
  const hasta = new Date(anio, mes, 0)
  const hoy = hoyCero()

  const partes = await db.parteDiario.findMany({
    where: { obraId, fecha: { gte: desde, lte: hasta } },
    select: {
      id: true,
      fecha: true,
      estado: true,
      _count: { select: { lineas: true } },
    },
    orderBy: { fecha: 'asc' },
  })

  const porFecha = new Map(
    partes.map((p) => [p.fecha.toISOString().slice(0, 10), p]),
  )

  return diasHabilesEntre(desde, hasta > hoy ? hoy : hasta).map((dia) => {
    const clave = dia.toISOString().slice(0, 10)
    const parte = porFecha.get(clave)
    return {
      fecha: dia,
      parteId: parte?.id ?? null,
      estado: parte?.estado ?? null,
      personas: parte?._count.lineas ?? 0,
      falta: !parte,
    }
  })
}

/* ---------------------------- QUINCENAS ----------------------------- */

export async function listarQuincenas() {
  return db.quincena.findMany({
    select: {
      id: true,
      anio: true,
      mes: true,
      numero: true,
      desde: true,
      hasta: true,
      estado: true,
      cerradaEn: true,
      cerradaPor: { select: { nombre: true } },
      _count: { select: { lineas: true } },
    },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { numero: 'desc' }],
    take: 12,
  })
}

/** El detalle de una quincena: por empleado y por obra. */
export async function detalleQuincena(quincenaId: string) {
  const quincena = await db.quincena.findUnique({
    where: { id: quincenaId },
    include: {
      cerradaPor: { select: { nombre: true } },
      novedades: {
        include: {
          empleado: { select: { id: true, nombre: true, apellido: true } },
          obra: { select: { codigo: true } },
        },
      },
      pagos: {
        include: {
          empleado: { select: { id: true, nombre: true, apellido: true } },
          subcontratista: { select: { razonSocial: true } },
        },
      },
    },
  })
  if (!quincena) return null

  const abierta = quincena.estado === EstadoQuincena.ABIERTA

  // Si está cerrada, los números salen de las líneas congeladas.
  // Si está abierta, se calculan al vuelo desde los partes aprobados.
  const lineas = abierta
    ? await lineasEnVivo(quincena.desde, quincena.hasta)
    : await lineasCongeladas(quincenaId)

  const porEmpleado = new Map<
    string,
    {
      empleadoId: string
      nombre: string
      legajo: string
      dias: number
      horasNormales: number
      horasExtra50: number
      horasExtra100: number
      ausencias: number
      costo: number
      obras: Set<string>
    }
  >()

  const porObra = new Map<
    string,
    { obraId: string; obra: string; personas: Set<string>; horas: number; costo: number }
  >()

  for (const l of lineas) {
    const e = porEmpleado.get(l.empleadoId) ?? {
      empleadoId: l.empleadoId,
      nombre: l.empleado,
      legajo: l.legajo,
      dias: 0,
      horasNormales: 0,
      horasExtra50: 0,
      horasExtra100: 0,
      ausencias: 0,
      costo: 0,
      obras: new Set<string>(),
    }
    e.dias += l.dias
    e.horasNormales += l.horasNormales
    e.horasExtra50 += l.horasExtra50
    e.horasExtra100 += l.horasExtra100
    e.ausencias += l.ausencias
    e.costo += l.costo
    e.obras.add(l.obra)
    porEmpleado.set(l.empleadoId, e)

    const o = porObra.get(l.obraId) ?? {
      obraId: l.obraId,
      obra: l.obra,
      personas: new Set<string>(),
      horas: 0,
      costo: 0,
    }
    o.personas.add(l.empleadoId)
    o.horas += l.horasNormales + l.horasExtra50 + l.horasExtra100
    o.costo += l.costo
    porObra.set(l.obraId, o)
  }

  const novedadesPorEmpleado = new Map<string, number>()
  for (const n of quincena.novedades) {
    const signo = n.tipo === 'DESCUENTO' || n.tipo === 'ADELANTO' ? -1 : 1
    novedadesPorEmpleado.set(
      n.empleadoId,
      (novedadesPorEmpleado.get(n.empleadoId) ?? 0) + signo * Number(n.monto),
    )
  }

  const pagados = new Set(
    quincena.pagos.filter((p) => p.empleadoId).map((p) => p.empleadoId as string),
  )

  return {
    quincena,
    abierta,
    empleados: [...porEmpleado.values()]
      .map((e) => ({
        ...e,
        obras: [...e.obras],
        novedades: novedadesPorEmpleado.get(e.empleadoId) ?? 0,
        neto: e.costo + (novedadesPorEmpleado.get(e.empleadoId) ?? 0),
        cobro: pagados.has(e.empleadoId),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    obras: [...porObra.values()]
      .map((o) => ({ ...o, personas: o.personas.size }))
      .sort((a, b) => b.costo - a.costo),
    totales: {
      costo: [...porEmpleado.values()].reduce((a, e) => a + e.costo, 0),
      horas: [...porEmpleado.values()].reduce(
        (a, e) => a + e.horasNormales + e.horasExtra50 + e.horasExtra100,
        0,
      ),
      personas: porEmpleado.size,
    },
  }
}

interface LineaResumen {
  empleadoId: string
  empleado: string
  legajo: string
  obraId: string
  obra: string
  dias: number
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  ausencias: number
  costo: number
}

async function lineasCongeladas(quincenaId: string): Promise<LineaResumen[]> {
  const lineas = await db.quincenaLinea.findMany({
    where: { quincenaId },
    include: {
      empleado: { select: { nombre: true, apellido: true, legajo: true } },
      obra: { select: { codigo: true } },
    },
  })

  return lineas.map((l) => ({
    empleadoId: l.empleadoId,
    empleado: `${l.empleado.apellido}, ${l.empleado.nombre}`,
    legajo: l.empleado.legajo,
    obraId: l.obraId,
    obra: l.obra.codigo,
    dias: l.diasTrabajados,
    horasNormales: Number(l.horasNormales),
    horasExtra50: Number(l.horasExtra50),
    horasExtra100: Number(l.horasExtra100),
    ausencias: l.ausencias,
    costo: Number(l.costo),
  }))
}

async function lineasEnVivo(desde: Date, hasta: Date): Promise<LineaResumen[]> {
  const partes = await db.parteDiario.findMany({
    where: { estado: EstadoParte.APROBADO, fecha: { gte: desde, lte: hasta } },
    select: {
      obraId: true,
      obra: { select: { codigo: true } },
      lineas: {
        select: {
          empleadoId: true,
          asistencia: true,
          horasNormales: true,
          horasExtra50: true,
          horasExtra100: true,
          costoCalculado: true,
          empleado: { select: { nombre: true, apellido: true, legajo: true } },
        },
      },
    },
  })

  const acumulado = new Map<string, LineaResumen>()

  for (const p of partes) {
    for (const l of p.lineas) {
      const clave = `${l.empleadoId}|${p.obraId}`
      const actual = acumulado.get(clave) ?? {
        empleadoId: l.empleadoId,
        empleado: `${l.empleado.apellido}, ${l.empleado.nombre}`,
        legajo: l.empleado.legajo,
        obraId: p.obraId,
        obra: p.obra.codigo,
        dias: 0,
        horasNormales: 0,
        horasExtra50: 0,
        horasExtra100: 0,
        ausencias: 0,
        costo: 0,
      }

      if (
        l.asistencia === Asistencia.PRESENTE ||
        l.asistencia === Asistencia.MEDIA_JORNADA
      ) {
        actual.dias += 1
      }
      if (
        l.asistencia === Asistencia.AUSENTE_CON_AVISO ||
        l.asistencia === Asistencia.AUSENTE_SIN_AVISO
      ) {
        actual.ausencias += 1
      }

      actual.horasNormales += Number(l.horasNormales)
      actual.horasExtra50 += Number(l.horasExtra50)
      actual.horasExtra100 += Number(l.horasExtra100)
      actual.costo += Number(l.costoCalculado ?? 0)

      acumulado.set(clave, actual)
    }
  }

  return [...acumulado.values()]
}

/** La quincena que corresponde a hoy, creándola si no existe. */
export async function quincenaActual() {
  const rango = quincenaDe(hoyCero())

  const existente = await db.quincena.findUnique({
    where: {
      anio_mes_numero: {
        anio: rango.anio,
        mes: rango.mes,
        numero: rango.numero,
      },
    },
  })
  if (existente) return existente

  return db.quincena.create({
    data: {
      anio: rango.anio,
      mes: rango.mes,
      numero: rango.numero,
      desde: rango.desde,
      hasta: rango.hasta,
      estado: EstadoQuincena.ABIERTA,
    },
  })
}

/* ------------------------- LISTAS AUXILIARES ------------------------ */

export async function empleadosParaAgregar(obraId: string, fecha: Date) {
  return db.empleado.findMany({
    where: {
      activo: true,
      NOT: {
        asignaciones: {
          some: {
            obraId,
            desde: { lte: fecha },
            OR: [{ hasta: null }, { hasta: { gte: fecha } }],
          },
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      legajo: true,
      categoria: true,
      especialidad: true,
    },
    orderBy: { apellido: 'asc' },
  })
}
