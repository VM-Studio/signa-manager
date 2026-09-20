import 'server-only'

import { EstadoAlerta, EstadoEnvio, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import { reglasHerramientas } from './reglas-herramientas'
import { reglasPersonal } from './reglas-personal'
import { reglasVehiculos } from './reglas-vehiculos'
import { reglasCompras, reglasSistema } from './reglas-compras'
import type { ConfiguracionRegla, Hallazgo, Regla } from './tipos'

/* =====================================================================
   El motor de alertas.

   Corre todas las reglas activas y deja la base en el estado correcto:

   · crea las alertas nuevas
   · NO duplica las que ya están abiertas (clave única)
   · pasa a RESUELTA las que ya no aparecen, porque el problema se
     solucionó solo

   Esa última parte es la que hace que el sistema sirva: al devolver una
   herramienta vencida, la alerta desaparece sin que nadie la toque.
   ===================================================================== */

export const TODAS_LAS_REGLAS: Regla[] = [
  ...reglasHerramientas,
  ...reglasPersonal,
  ...reglasVehiculos,
  ...reglasCompras,
  ...reglasSistema,
]

const REGLAS_POR_CODIGO = new Map(TODAS_LAS_REGLAS.map((r) => [r.codigo, r]))

export interface ResultadoEvaluacion {
  ok: boolean
  duracion: number
  /** Cuántos hallazgos devolvió cada regla. */
  porRegla: Array<{
    codigo: string
    nombre: string
    hallazgos: number
    nuevas: number
    error?: string
  }>
  nuevas: number
  resueltas: number
  abiertas: number
  criticas: number
  notificaciones: number
  errores: string[]
}

/**
 * Corre las reglas y actualiza las alertas.
 *
 * `modulos` limita la corrida a los módulos afectados: se usa después
 * de las acciones que más alertas resuelven (devolver una herramienta,
 * aprobar un parte, asignar un viaje), para que la alerta desaparezca
 * en el momento y no una hora después.
 */
export async function evaluarAlertas(
  modulos?: string[],
): Promise<ResultadoEvaluacion> {
  const arranque = Date.now()

  const reglasConfiguradas = await db.reglaAlerta.findMany({
    where: {
      activa: true,
      ...(modulos ? { modulo: { in: modulos } } : {}),
    },
  })

  const porRegla: ResultadoEvaluacion['porRegla'] = []
  const errores: string[] = []
  const hallazgosPorRegla = new Map<string, Hallazgo[]>()

  // 1. Correr cada regla. Si una falla, se registra y se sigue: una
  //    regla rota no puede dejar al sistema sin avisar de lo demás.
  for (const configurada of reglasConfiguradas) {
    const regla = REGLAS_POR_CODIGO.get(configurada.codigo)

    if (!regla) {
      errores.push(
        `La regla ${configurada.codigo} está en la base pero no está implementada.`,
      )
      porRegla.push({
        codigo: configurada.codigo,
        nombre: configurada.nombre,
        hallazgos: 0,
        nuevas: 0,
        error: 'Sin implementar',
      })
      continue
    }

    const config: ConfiguracionRegla = {
      codigo: configurada.codigo,
      severidad: configurada.severidad,
      umbral: configurada.umbral ?? 0,
      rolesDestino: configurada.rolesDestino,
    }

    try {
      const hallazgos = await regla.evaluar(config)
      hallazgosPorRegla.set(configurada.id, hallazgos)
      porRegla.push({
        codigo: configurada.codigo,
        nombre: configurada.nombre,
        hallazgos: hallazgos.length,
        nuevas: 0,
      })
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      errores.push(`${configurada.codigo}: ${mensaje}`)
      porRegla.push({
        codigo: configurada.codigo,
        nombre: configurada.nombre,
        hallazgos: 0,
        nuevas: 0,
        error: mensaje,
      })
    }
  }

  /*
   * 2. Las alertas que ya existen para las reglas que corrieron.
   *
   * Se traen TODAS, no solo las abiertas: `claveUnica` es única en la
   * base, así que si un problema se resolvió y volvió a pasar (la
   * herramienta volvió a salir a la misma obra parada) hay que reabrir
   * la fila que ya está, no crear otra. Crear otra rompe la regla entera
   * con un error de clave repetida.
   */
  const reglasQueCorrieron = [...hallazgosPorRegla.keys()]
  const existentes = await db.alerta.findMany({
    where: { reglaId: { in: reglasQueCorrieron } },
    select: { id: true, claveUnica: true, reglaId: true, estado: true },
  })

  const porClave = new Map(existentes.map((a) => [a.claveUnica, a]))
  const abiertasAhora = existentes.filter(
    (a) =>
      a.estado === EstadoAlerta.ABIERTA || a.estado === EstadoAlerta.VISTA,
  )

  // 3. Crear las nuevas y marcar cuáles siguen vigentes.
  const clavesVigentes = new Set<string>()
  const nuevasParaNotificar: Array<{ alertaId: string; reglaId: string }> = []
  let nuevas = 0

  for (const [reglaId, hallazgos] of hallazgosPorRegla) {
    const configurada = reglasConfiguradas.find((r) => r.id === reglaId)
    if (!configurada) continue

    for (const h of hallazgos) {
      clavesVigentes.add(h.claveUnica)

      const existente = porClave.get(h.claveUnica)

      if (existente) {
        const estabaAbierta =
          existente.estado === EstadoAlerta.ABIERTA ||
          existente.estado === EstadoAlerta.VISTA

        await db.alerta.update({
          where: { id: existente.id },
          data: {
            titulo: h.titulo,
            detalle: h.detalle,
            severidad: h.severidad ?? configurada.severidad,
            enlace: h.enlace,
            // Si estaba abierta, no se toca el estado: alguien pudo
            // haberla marcado como vista. Si estaba resuelta o
            // descartada, el problema volvió y se reabre.
            ...(estabaAbierta
              ? {}
              : { estado: EstadoAlerta.ABIERTA, resueltaEn: null }),
          },
        })

        if (!estabaAbierta) {
          // Volvió a pasar: cuenta como nueva y hay que avisar de nuevo.
          nuevas += 1
          nuevasParaNotificar.push({ alertaId: existente.id, reglaId })

          const fila = porRegla.find((p) => p.codigo === configurada.codigo)
          if (fila) fila.nuevas += 1
        }

        continue
      }

      const creada = await db.alerta.create({
        data: {
          claveUnica: h.claveUnica,
          reglaId,
          severidad: h.severidad ?? configurada.severidad,
          titulo: h.titulo,
          detalle: h.detalle,
          entidadTipo: h.entidadTipo,
          entidadId: h.entidadId,
          enlace: h.enlace,
          obraId: h.obraId ?? null,
          estado: EstadoAlerta.ABIERTA,
        },
      })

      nuevas += 1
      nuevasParaNotificar.push({ alertaId: creada.id, reglaId })

      const fila = porRegla.find((p) => p.codigo === configurada.codigo)
      if (fila) fila.nuevas += 1
    }
  }

  // 4. Las que ya no aparecen se resolvieron solas.
  const aResolver = abiertasAhora
    .filter((a) => !clavesVigentes.has(a.claveUnica))
    .map((a) => a.id)

  let resueltas = 0
  if (aResolver.length > 0) {
    const resultado = await db.alerta.updateMany({
      where: { id: { in: aResolver } },
      data: { estado: EstadoAlerta.RESUELTA, resueltaEn: new Date() },
    })
    resueltas = resultado.count
  }

  // 5. Notificaciones para las alertas nuevas.
  const notificaciones = await generarNotificaciones(
    nuevasParaNotificar,
    reglasConfiguradas,
  )

  const [abiertas, criticas] = await Promise.all([
    db.alerta.count({
      where: { estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] } },
    }),
    db.alerta.count({
      where: {
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
        severidad: Severidad.CRITICA,
      },
    }),
  ])

  return {
    ok: errores.length === 0,
    duracion: Date.now() - arranque,
    porRegla,
    nuevas,
    resueltas,
    abiertas,
    criticas,
    notificaciones,
    errores,
  }
}

/* ------------------------- NOTIFICACIONES --------------------------- */

/**
 * Registros de envío para los usuarios que corresponden según los roles
 * destino de cada regla.
 *
 * El canal de la app funciona ya (la campana y la bandeja leen las
 * alertas). Email y WhatsApp quedan registrados como PENDIENTE hasta
 * que se conecte un proveedor: ver `notificaciones.ts`.
 */
async function generarNotificaciones(
  nuevas: Array<{ alertaId: string; reglaId: string }>,
  reglas: Array<{ id: string; rolesDestino: string[]; canales: string[] }>,
): Promise<number> {
  if (nuevas.length === 0) return 0

  const rolesPorRegla = new Map(reglas.map((r) => [r.id, r]))

  // Todos los roles que aparecen, para traer los usuarios de una.
  const rolesNecesarios = new Set<string>()
  for (const n of nuevas) {
    const regla = rolesPorRegla.get(n.reglaId)
    for (const rol of regla?.rolesDestino ?? []) rolesNecesarios.add(rol)
  }
  if (rolesNecesarios.size === 0) return 0

  const usuarios = await db.usuario.findMany({
    where: { activo: true, rol: { in: [...rolesNecesarios] as never } },
    select: { id: true, rol: true },
  })

  const porRol = new Map<string, string[]>()
  for (const u of usuarios) {
    const lista = porRol.get(u.rol) ?? []
    lista.push(u.id)
    porRol.set(u.rol, lista)
  }

  const aCrear: Array<{
    alertaId: string
    usuarioId: string
    canal: 'APP' | 'EMAIL' | 'WHATSAPP'
  }> = []

  for (const n of nuevas) {
    const regla = rolesPorRegla.get(n.reglaId)
    if (!regla) continue

    const destinatarios = new Set<string>()
    for (const rol of regla.rolesDestino) {
      for (const id of porRol.get(rol) ?? []) destinatarios.add(id)
    }

    for (const usuarioId of destinatarios) {
      for (const canal of regla.canales) {
        aCrear.push({
          alertaId: n.alertaId,
          usuarioId,
          canal: canal as 'APP' | 'EMAIL' | 'WHATSAPP',
        })
      }
    }
  }

  if (aCrear.length === 0) return 0

  const ahora = new Date()

  await db.notificacionEnvio.createMany({
    data: aCrear.map((n) => ({
      ...n,
      /*
       * El canal de la app no manda nada: la alerta ya está en la base y
       * la campana la lee de ahí. Se registra como enviada en el momento
       * para que la cola tenga solo lo que de verdad falta despachar.
       */
      estado:
        n.canal === 'APP' ? EstadoEnvio.ENVIADO : EstadoEnvio.PENDIENTE,
      enviadoEn: n.canal === 'APP' ? ahora : null,
    })),
  })

  return aCrear.length
}

/* --------------------- REEVALUACIÓN PUNTUAL ------------------------- */

/**
 * Vuelve a correr solo las reglas de los módulos afectados.
 *
 * Se llama después de las acciones que más alertas resuelven, para que
 * el usuario vea desaparecer la alerta en el momento en vez de
 * preguntarse por qué sigue ahí.
 *
 * Nunca hace fallar la acción que la llamó: si el motor se rompe, la
 * herramienta igual se devolvió.
 */
export async function reevaluarModulos(modulos: string[]): Promise<void> {
  try {
    await evaluarAlertas(modulos)
  } catch (error) {
    console.error('[alertas] no se pudo reevaluar', modulos, error)
  }
}
