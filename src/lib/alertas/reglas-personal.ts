import 'server-only'

import { Asistencia, EstadoParte, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import { quincenaDe } from '@/server/personal/reglas'
import {
  clave,
  diasDesde,
  diasHasta,
  enDias,
  fecha,
  haceDias,
  hoyCero,
  plata,
  plural,
  textoEnum,
  ultimosDiasHabiles,
  type Hallazgo,
  type Regla,
} from './tipos'

/* =====================================================================
   Reglas del módulo de personal.
   ===================================================================== */

/** Apto médico, ART, curso de seguridad o licencia por vencer. */
export const docEmpleadoPorVencer: Regla = {
  codigo: 'DOC_EMPLEADO_POR_VENCER',
  modulo: 'personal',
  async evaluar(config) {
    const hoy = hoyCero()
    const limite = enDias(config.umbral)

    const documentos = await db.documentoEmpleado.findMany({
      where: {
        vencimiento: { lte: limite },
        empleado: { activo: true },
      },
      select: {
        id: true,
        tipo: true,
        vencimiento: true,
        empleadoId: true,
        empleado: { select: { nombre: true, apellido: true, legajo: true } },
      },
    })

    return documentos.map((d): Hallazgo => {
      const vencido = (d.vencimiento as Date) < hoy
      const dias = diasHasta(d.vencimiento as Date)

      return {
        // Discriminante por documento: un empleado puede tener varios vencidos.
        claveUnica: clave(config.codigo, 'DocumentoEmpleado', d.id),
        titulo: vencido
          ? `${d.empleado.nombre} ${d.empleado.apellido} con documentación vencida`
          : `${d.empleado.nombre} ${d.empleado.apellido}: documentación por vencer`,
        detalle: `${textoEnum(d.tipo)} ${
          vencido
            ? `venció el ${fecha(d.vencimiento)}. Por seguridad y por responsabilidad legal no debería entrar a la obra.`
            : `vence el ${fecha(d.vencimiento)}, dentro de ${plural(dias, 'día')}.`
        }`,
        entidadTipo: 'Empleado',
        entidadId: d.empleadoId,
        enlace: `/personal/empleados/${d.empleadoId}?pestana=documentacion`,
        severidad: vencido ? Severidad.CRITICA : config.severidad,
      }
    })
  },
}

/** Subcontratista con papeles vencidos que estuvo en obra hace poco. */
export const docSubcontratistaVencida: Regla = {
  codigo: 'DOC_SUBCONTRATISTA_VENCIDA',
  modulo: 'personal',
  async evaluar(config) {
    const hoy = hoyCero()
    const desde = haceDias(config.umbral)

    const subcontratistas = await db.subcontratista.findMany({
      where: {
        activo: true,
        documentos: { some: { vencimiento: { lt: hoy } } },
        // La clave: solo si registró presencia en obra en los últimos días.
        presencias: { some: { parte: { fecha: { gte: desde } } } },
      },
      select: {
        id: true,
        razonSocial: true,
        documentos: {
          where: { vencimiento: { lt: hoy } },
          select: { tipo: true, vencimiento: true },
        },
        presencias: {
          where: { parte: { fecha: { gte: desde } } },
          select: {
            parte: { select: { obraId: true, obra: { select: { codigo: true } } } },
          },
          take: 1,
        },
      },
    })

    return subcontratistas.map((s): Hallazgo => ({
      claveUnica: clave(config.codigo, 'Subcontratista', s.id),
      titulo: `${s.razonSocial} trabajando con papeles vencidos`,
      detalle: `Tiene ${plural(
        s.documentos.length,
        'documento vencido',
        'documentos vencidos',
      )} (${s.documentos.map((d) => textoEnum(d.tipo)).join(', ')}) y su gente estuvo en ${
        s.presencias[0]?.parte.obra.codigo ?? 'obra'
      } en los últimos días. Es responsabilidad legal directa de la empresa.`,
      entidadTipo: 'Subcontratista',
      entidadId: s.id,
      enlace: `/personal/subcontratistas/${s.id}`,
      obraId: s.presencias[0]?.parte.obraId ?? null,
    }))
  },
}

/** Obra en curso con gente asignada y sin parte de un día hábil anterior. */
export const parteDiarioFaltante: Regla = {
  codigo: 'PARTE_DIARIO_FALTANTE',
  modulo: 'personal',
  async evaluar(config) {
    // Se revisan los últimos días hábiles según el umbral (por defecto 1).
    const dias = ultimosDiasHabiles(Math.max(1, config.umbral))
    const masViejo = dias[dias.length - 1]

    const [obras, partes] = await Promise.all([
      db.obra.findMany({
        where: {
          estado: 'EN_CURSO',
          asignaciones: {
            some: {
              empleadoId: { not: null },
              desde: { lte: dias[0] },
              OR: [{ hasta: null }, { hasta: { gte: masViejo } }],
            },
          },
        },
        select: { id: true, codigo: true, nombre: true },
      }),
      db.parteDiario.findMany({
        where: { fecha: { gte: masViejo, lte: dias[0] } },
        select: { obraId: true, fecha: true },
      }),
    ])

    const cargados = new Set(
      partes.map((p) => `${p.obraId}|${p.fecha.toISOString().slice(0, 10)}`),
    )

    const hallazgos: Hallazgo[] = []

    for (const obra of obras) {
      for (const dia of dias) {
        const c = `${obra.id}|${dia.toISOString().slice(0, 10)}`
        if (cargados.has(c)) continue

        hallazgos.push({
          // Discriminante por día: si faltan dos días, son dos alertas.
          claveUnica: clave(
            config.codigo,
            'Obra',
            obra.id,
            dia.toISOString().slice(0, 10),
          ),
          titulo: `Falta el parte de ${obra.codigo}`,
          detalle: `${obra.nombre} no tiene el parte del ${fecha(dia)}. Sin parte no hay horas, y sin horas no hay costo de mano de obra.`,
          entidadTipo: 'Obra',
          entidadId: obra.id,
          enlace: `/personal/partes/nuevo?obra=${obra.id}&fecha=${dia.toISOString().slice(0, 10)}`,
          obraId: obra.id,
        })
      }
    }

    return hallazgos
  },
}

/** Parte enviado que nadie aprueba. */
export const parteSinAprobar: Regla = {
  codigo: 'PARTE_SIN_APROBAR',
  modulo: 'personal',
  async evaluar(config) {
    const limite = enDias(-config.umbral)

    const partes = await db.parteDiario.findMany({
      where: { estado: EstadoParte.ENVIADO, enviadoEn: { lt: limite } },
      select: {
        id: true,
        fecha: true,
        enviadoEn: true,
        obraId: true,
        obra: { select: { codigo: true, nombre: true } },
        _count: { select: { lineas: true } },
      },
    })

    return partes.map((p): Hallazgo => ({
      claveUnica: clave(config.codigo, 'ParteDiario', p.id),
      titulo: `Parte de ${p.obra.codigo} sin aprobar`,
      detalle: `El parte del ${fecha(p.fecha)} con ${plural(
        p._count.lineas,
        'persona',
      )} está esperando aprobación hace ${plural(
        diasDesde(p.enviadoEn as Date),
        'día',
      )}. Hasta que no se apruebe, el costo no entra en la quincena.`,
      entidadTipo: 'ParteDiario',
      entidadId: p.id,
      enlace: `/personal/partes/nuevo?obra=${p.obraId}&fecha=${p.fecha.toISOString().slice(0, 10)}`,
      obraId: p.obraId,
    }))
  },
}

/** Demasiadas horas extra en la quincena en curso. */
export const horasExtraExcesivas: Regla = {
  codigo: 'HORAS_EXTRA_EXCESIVAS',
  modulo: 'personal',
  async evaluar(config) {
    const rango = quincenaDe(hoyCero())

    const lineas = await db.parteDiarioLinea.findMany({
      where: {
        parte: {
          estado: EstadoParte.APROBADO,
          fecha: { gte: rango.desde, lte: rango.hasta },
        },
      },
      select: {
        empleadoId: true,
        horasExtra50: true,
        horasExtra100: true,
        empleado: { select: { nombre: true, apellido: true, legajo: true } },
      },
    })

    const porEmpleado = new Map<
      string,
      { horas: number; nombre: string; legajo: string }
    >()

    for (const l of lineas) {
      const extra = Number(l.horasExtra50) + Number(l.horasExtra100)
      if (extra === 0) continue

      const actual = porEmpleado.get(l.empleadoId) ?? {
        horas: 0,
        nombre: `${l.empleado.nombre} ${l.empleado.apellido}`,
        legajo: l.empleado.legajo,
      }
      actual.horas += extra
      porEmpleado.set(l.empleadoId, actual)
    }

    return [...porEmpleado.entries()]
      .filter(([, d]) => d.horas > config.umbral)
      .map(([empleadoId, d]): Hallazgo => ({
        claveUnica: clave(
          config.codigo,
          'Empleado',
          empleadoId,
          `${rango.anio}-${rango.mes}-${rango.numero}`,
        ),
        titulo: `${d.nombre} con muchas horas extra`,
        detalle: `Lleva ${d.horas} horas extra en esta quincena, por encima de las ${config.umbral} del umbral. Encarece la obra y puede ser un problema de dotación.`,
        entidadTipo: 'Empleado',
        entidadId: empleadoId,
        enlace: `/personal/empleados/${empleadoId}?pestana=asistencia`,
      }))
  },
}

/** Empleado activo que hace días no está asignado a ninguna obra. */
export const empleadoSinAsignacion: Regla = {
  codigo: 'EMPLEADO_SIN_ASIGNACION',
  modulo: 'personal',
  async evaluar(config) {
    const dias = ultimosDiasHabiles(config.umbral)
    const desde = dias[dias.length - 1]
    const ahora = new Date()

    const empleados = await db.empleado.findMany({
      where: {
        activo: true,
        asignaciones: {
          none: {
            desde: { lte: ahora },
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
        valorHora: true,
      },
    })

    return empleados.map((e): Hallazgo => ({
      claveUnica: clave(config.codigo, 'Empleado', e.id),
      titulo: `${e.nombre} ${e.apellido} sin obra asignada`,
      detalle: `Legajo ${e.legajo}, ${textoEnum(e.categoria)}. Hace ${plural(
        config.umbral,
        'día hábil',
        'días hábiles',
      )} que no está asignado a ninguna obra y se le paga igual: ${plata(
        Number(e.valorHora) * 8,
      )} por jornada.`,
      entidadTipo: 'Empleado',
      entidadId: e.id,
      enlace: `/personal/planificacion`,
    }))
  },
}

/** Ausencias sin aviso reiteradas en el mes. */
export const ausenciasSinAviso: Regla = {
  codigo: 'AUSENCIAS_SIN_AVISO',
  modulo: 'personal',
  async evaluar(config) {
    const hoy = hoyCero()
    const inicioDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    const grupos = await db.parteDiarioLinea.groupBy({
      by: ['empleadoId'],
      where: {
        asistencia: Asistencia.AUSENTE_SIN_AVISO,
        parte: { fecha: { gte: inicioDelMes } },
      },
      _count: true,
    })

    const conProblema = grupos.filter((g) => g._count >= config.umbral)
    if (conProblema.length === 0) return []

    const empleados = await db.empleado.findMany({
      where: { id: { in: conProblema.map((g) => g.empleadoId) } },
      select: { id: true, nombre: true, apellido: true, legajo: true },
    })
    const porId = new Map(empleados.map((e) => [e.id, e]))

    return conProblema.map((g): Hallazgo => {
      const e = porId.get(g.empleadoId)
      const mes = hoy.toLocaleDateString('es-AR', { month: 'long' })

      return {
        claveUnica: clave(
          config.codigo,
          'Empleado',
          g.empleadoId,
          `${hoy.getFullYear()}-${hoy.getMonth() + 1}`,
        ),
        titulo: `${e?.nombre} ${e?.apellido} con ausencias sin aviso`,
        detalle: `${plural(g._count, 'ausencia')} sin aviso en ${mes}. Legajo ${e?.legajo}.`,
        entidadTipo: 'Empleado',
        entidadId: g.empleadoId,
        enlace: `/personal/empleados/${g.empleadoId}?pestana=asistencia`,
      }
    })
  },
}

/** El costo de mano de obra se come el presupuesto de la obra. */
export const presupuestoManoObra: Regla = {
  codigo: 'PRESUPUESTO_MANO_OBRA',
  modulo: 'obras',
  async evaluar(config) {
    const obras = await db.obra.findMany({
      where: {
        estado: { in: ['EN_CURSO', 'PAUSADA'] },
        presupuestoManoObra: { not: null, gt: 0 },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        presupuestoManoObra: true,
      },
    })
    if (obras.length === 0) return []

    // Una sola consulta agregada para todas las obras.
    const partes = await db.parteDiario.findMany({
      where: {
        estado: EstadoParte.APROBADO,
        obraId: { in: obras.map((o) => o.id) },
      },
      select: {
        obraId: true,
        lineas: { select: { costoCalculado: true } },
      },
    })

    const gastado = new Map<string, number>()
    for (const p of partes) {
      const suma = p.lineas.reduce((a, l) => a + Number(l.costoCalculado ?? 0), 0)
      gastado.set(p.obraId, (gastado.get(p.obraId) ?? 0) + suma)
    }

    const hallazgos: Hallazgo[] = []

    for (const obra of obras) {
      const presupuesto = Number(obra.presupuestoManoObra)
      const consumido = gastado.get(obra.id) ?? 0
      const porcentaje = (consumido / presupuesto) * 100

      if (porcentaje < config.umbral) continue

      const excedido = porcentaje > 100

      hallazgos.push({
        claveUnica: clave(config.codigo, 'Obra', obra.id),
        titulo: excedido
          ? `${obra.codigo} se pasó del presupuesto de mano de obra`
          : `${obra.codigo} cerca del presupuesto de mano de obra`,
        detalle: excedido
          ? `Lleva ${plata(consumido)} sobre un presupuesto de ${plata(presupuesto)}: ${plata(consumido - presupuesto)} por encima.`
          : `Lleva ${plata(consumido)} de ${plata(presupuesto)}, el ${porcentaje.toFixed(0)}% del presupuesto. Quedan ${plata(presupuesto - consumido)}.`,
        entidadTipo: 'Obra',
        entidadId: obra.id,
        enlace: `/obras/${obra.id}`,
        obraId: obra.id,
        severidad: excedido ? Severidad.CRITICA : config.severidad,
      })
    }

    return hallazgos
  },
}

export const reglasPersonal: Regla[] = [
  docEmpleadoPorVencer,
  docSubcontratistaVencida,
  parteDiarioFaltante,
  parteSinAprobar,
  horasExtraExcesivas,
  empleadoSinAsignacion,
  ausenciasSinAviso,
  presupuestoManoObra,
]
