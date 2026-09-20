import 'server-only'

import { EstadoHerramienta, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import {
  clave,
  diasDesde,
  diasHasta,
  enDias,
  hoyCero,
  plata,
  plural,
  type Hallazgo,
  type Regla,
} from './tipos'

/* =====================================================================
   Reglas del módulo de herramientas.

   Cada una hace UNA consulta agregada, no una por entidad: con 128
   herramientas y 23 reglas corriendo cada hora, hacer una consulta por
   herramienta sería inaceptable.
   ===================================================================== */

/** Pasó la fecha prevista de devolución y sigue en obra. */
export const herramientaNoDevuelta: Regla = {
  codigo: 'HERRAMIENTA_NO_DEVUELTA',
  modulo: 'herramientas',
  async evaluar(config) {
    const hoy = hoyCero()

    const herramientas = await db.herramienta.findMany({
      where: {
        estado: EstadoHerramienta.EN_OBRA,
        fechaDevolucionPrevista: { lt: hoy },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        fechaDevolucionPrevista: true,
        obraId: true,
        obra: { select: { codigo: true, nombre: true } },
        responsableActual: { select: { nombre: true, apellido: true } },
      },
    })

    return herramientas.map((h): Hallazgo => {
      const atraso = diasDesde(h.fechaDevolucionPrevista as Date)
      // Pasa a crítica cuando la demora supera el umbral.
      const critica = atraso > config.umbral

      return {
        claveUnica: clave(config.codigo, 'Herramienta', h.id),
        titulo: `${h.nombre} sin devolver`,
        detalle: `${h.codigo} tenía que volver hace ${plural(atraso, 'día')}. Está en ${h.obra?.codigo ?? 'una obra'}${
          h.responsableActual
            ? `, a cargo de ${h.responsableActual.nombre} ${h.responsableActual.apellido}`
            : ''
        }.`,
        entidadTipo: 'Herramienta',
        entidadId: h.id,
        enlace: `/herramientas/${h.id}`,
        obraId: h.obraId,
        severidad: critica ? Severidad.CRITICA : config.severidad,
      }
    })
  },
}

/**
 * Quedó en una obra que ya terminó o está pausada.
 *
 * El "hace más de N días" se mide por hace cuánto está la herramienta
 * ahí, no por cuándo cambió el estado de la obra: lo que importa es el
 * tiempo que la herramienta lleva parada.
 */
export const herramientaEnObraInactiva: Regla = {
  codigo: 'HERRAMIENTA_EN_OBRA_INACTIVA',
  modulo: 'herramientas',
  async evaluar(config) {
    const limite = enDias(-config.umbral)

    const herramientas = await db.herramienta.findMany({
      where: {
        estado: EstadoHerramienta.EN_OBRA,
        obra: { estado: { in: ['FINALIZADA', 'PAUSADA'] } },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        valorCompra: true,
        obraId: true,
        obra: { select: { codigo: true, nombre: true, estado: true } },
        // El movimiento que la dejó en esa obra.
        movimientos: {
          where: { tipo: { in: ['SALIDA_A_OBRA', 'TRANSFERENCIA'] } },
          select: { fecha: true },
          orderBy: { fecha: 'desc' },
          take: 1,
        },
      },
    })

    return herramientas
      .filter((h) => {
        const desdeCuando = h.movimientos[0]?.fecha
        // Sin movimiento registrado se avisa igual: es aún más raro.
        return !desdeCuando || desdeCuando < limite
      })
      .map((h): Hallazgo => {
        const desdeCuando = h.movimientos[0]?.fecha
        const dias = desdeCuando ? diasDesde(desdeCuando) : null

        return {
          claveUnica: clave(config.codigo, 'Herramienta', h.id),
          titulo: `${h.nombre} parada en una obra sin actividad`,
          detalle: `${h.codigo} sigue en ${h.obra?.codigo}, que está ${
            h.obra?.estado === 'FINALIZADA' ? 'finalizada' : 'pausada'
          }${dias !== null ? `, y está ahí hace ${plural(dias, 'día')}` : ''}.${
            h.valorCompra
              ? ` Son ${plata(Number(h.valorCompra))} parados que otra obra podría estar usando.`
              : ' Conviene traerla al depósito.'
          }`,
          entidadTipo: 'Herramienta',
          entidadId: h.id,
          enlace: `/herramientas/${h.id}`,
          obraId: h.obraId,
        }
      })
  },
}

/** Pasó la fecha del próximo mantenimiento preventivo. */
export const mantenimientoHerramientaVencido: Regla = {
  codigo: 'MANTENIMIENTO_HERRAMIENTA_VENCIDO',
  modulo: 'herramientas',
  async evaluar(config) {
    const hoy = hoyCero()

    const herramientas = await db.herramienta.findMany({
      where: {
        proximoMantenimiento: { lt: hoy },
        estado: { not: EstadoHerramienta.BAJA },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        proximoMantenimiento: true,
        obraId: true,
      },
    })

    return herramientas.map((h): Hallazgo => ({
      claveUnica: clave(config.codigo, 'Herramienta', h.id),
      titulo: `${h.nombre} con el mantenimiento vencido`,
      detalle: `${h.codigo} tenía que hacerse el service hace ${plural(
        diasDesde(h.proximoMantenimiento as Date),
        'día',
      )}. Usarla así acorta su vida útil y es un riesgo en obra.`,
      entidadTipo: 'Herramienta',
      entidadId: h.id,
      enlace: `/herramientas/${h.id}/mantenimiento`,
      obraId: h.obraId,
    }))
  },
}

/** Lleva demasiado tiempo en el taller. */
export const herramientaEnReparacionDemorada: Regla = {
  codigo: 'HERRAMIENTA_EN_REPARACION_DEMORADA',
  modulo: 'herramientas',
  async evaluar(config) {
    const limite = enDias(-config.umbral)

    // El último envío a reparación de cada herramienta que sigue en el taller.
    const enviadas = await db.movimientoHerramienta.findMany({
      where: {
        tipo: 'ENVIO_A_REPARACION',
        fecha: { lt: limite },
        herramienta: { estado: EstadoHerramienta.EN_REPARACION },
      },
      select: {
        fecha: true,
        herramienta: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    })

    // Una alerta por herramienta, con el envío más reciente.
    const vistas = new Set<string>()
    const hallazgos: Hallazgo[] = []

    for (const m of enviadas) {
      if (vistas.has(m.herramienta.id)) continue
      vistas.add(m.herramienta.id)

      hallazgos.push({
        claveUnica: clave(config.codigo, 'Herramienta', m.herramienta.id),
        titulo: `${m.herramienta.nombre} hace mucho en el taller`,
        detalle: `${m.herramienta.codigo} está en reparación hace ${plural(
          diasDesde(m.fecha),
          'día',
        )}. Hay que reclamarle al taller o darla de baja.`,
        entidadTipo: 'Herramienta',
        entidadId: m.herramienta.id,
        enlace: `/herramientas/${m.herramienta.id}`,
      })
    }

    return hallazgos
  },
}

/** Se acerca la fecha en que se necesita y la solicitud sigue pendiente. */
export const solicitudHerramientaSinResolver: Regla = {
  codigo: 'SOLICITUD_HERRAMIENTA_SIN_RESOLVER',
  modulo: 'herramientas',
  async evaluar(config) {
    const limite = enDias(config.umbral)

    const solicitudes = await db.solicitudHerramienta.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaNecesaria: { lte: limite },
      },
      select: {
        id: true,
        descripcion: true,
        fechaNecesaria: true,
        prioridad: true,
        obraId: true,
        obra: { select: { codigo: true } },
      },
    })

    return solicitudes.map((s): Hallazgo => {
      const faltan = diasHasta(s.fechaNecesaria)

      return {
        claveUnica: clave(config.codigo, 'SolicitudHerramienta', s.id),
        titulo: 'Solicitud de herramienta sin resolver',
        detalle: `${s.obra.codigo} pidió ${s.descripcion.toLowerCase()} para ${
          faltan < 0
            ? `hace ${plural(Math.abs(faltan), 'día')}`
            : faltan === 0
              ? 'hoy'
              : `dentro de ${plural(faltan, 'día')}`
        }. Si no se resuelve, la obra la compra por su cuenta.`,
        entidadTipo: 'SolicitudHerramienta',
        entidadId: s.id,
        enlace: `/herramientas/solicitudes/${s.id}`,
        obraId: s.obraId,
        severidad:
          faltan < 0 || s.prioridad === 'URGENTE'
            ? Severidad.CRITICA
            : config.severidad,
      }
    })
  },
}

export const reglasHerramientas: Regla[] = [
  herramientaNoDevuelta,
  herramientaEnObraInactiva,
  mantenimientoHerramientaVencido,
  herramientaEnReparacionDemorada,
  solicitudHerramientaSinResolver,
]
