import 'server-only'

import { CanalNotificacion, EstadoEnvio, EstadoAlerta } from '@prisma/client'
import { db } from '@/lib/db'

/* =====================================================================
   Envío de notificaciones.

   El canal APP ya funciona: la campana del header y la bandeja de
   alertas leen directo de la base.

   Email y WhatsApp tienen la interfaz lista y una implementación que
   por ahora solo registra en consola. Cuando se contrate el proveedor,
   se escribe el adaptador y no cambia nada más.
   ===================================================================== */

export interface MensajeNotificacion {
  destinatario: { nombre: string; email: string; telefono: string | null }
  asunto: string
  cuerpo: string
  /** Enlace que lleva al lugar donde se resuelve. */
  enlace: string
}

export interface CanalDeEnvio {
  readonly canal: CanalNotificacion
  readonly disponible: boolean
  enviar(mensaje: MensajeNotificacion): Promise<void>
}

/* ------------------------------ EMAIL ------------------------------- */

/**
 * COMPLETAR cuando se elija el proveedor (Resend, SendGrid, SES…).
 * Lo único que hay que cambiar es el cuerpo de `enviar`: el resto del
 * sistema ya llama a esta interfaz.
 */
class CanalEmail implements CanalDeEnvio {
  readonly canal = CanalNotificacion.EMAIL

  get disponible(): boolean {
    return Boolean(process.env.EMAIL_API_KEY)
  }

  async enviar(mensaje: MensajeNotificacion): Promise<void> {
    // Sin proveedor conectado NO se marca como enviado: queda pendiente
    // para cuando se conecte. Marcarlo como enviado sería mentir.
    if (!this.disponible) {
      throw new Error(
        'El canal de email todavía no está conectado. Completá el adaptador en src/lib/alertas/notificaciones.ts.',
      )
    }
    void mensaje

    // COMPLETAR: la llamada real al proveedor.
    //   await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
    //       'content-type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       from: process.env.EMAIL_DESDE,
    //       to: mensaje.destinatario.email,
    //       subject: mensaje.asunto,
    //       html: armarHtml(mensaje),
    //     }),
    //   })
    throw new Error(
      'El canal de email todavía no está conectado. Completá el adaptador en src/lib/alertas/notificaciones.ts.',
    )
  }
}

/* ----------------------------- WHATSAPP ----------------------------- */

/**
 * COMPLETAR cuando se apruebe la cuenta de WhatsApp Business.
 * Importante: WhatsApp exige plantillas aprobadas para iniciar una
 * conversación, así que el cuerpo del mensaje va a tener que armarse
 * con los parámetros de la plantilla, no como texto libre.
 */
class CanalWhatsApp implements CanalDeEnvio {
  readonly canal = CanalNotificacion.WHATSAPP

  get disponible(): boolean {
    return Boolean(
      process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID,
    )
  }

  async enviar(mensaje: MensajeNotificacion): Promise<void> {
    if (!this.disponible) {
      throw new Error(
        'El canal de WhatsApp todavía no está conectado. Completá el adaptador en src/lib/alertas/notificaciones.ts.',
      )
    }

    if (!mensaje.destinatario.telefono) {
      throw new Error(
        `${mensaje.destinatario.nombre} no tiene teléfono cargado.`,
      )
    }

    // COMPLETAR: la API de WhatsApp Business.
    //   await fetch(
    //     `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    //     { method: 'POST', headers: {...}, body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to: normalizarTelefono(mensaje.destinatario.telefono),
    //       type: 'template',
    //       template: { name: 'alerta_signa', language: { code: 'es_AR' },
    //         components: [...] },
    //     })},
    //   )
    throw new Error(
      'El canal de WhatsApp todavía no está conectado. Completá el adaptador en src/lib/alertas/notificaciones.ts.',
    )
  }
}

/* -------------------------------- APP ------------------------------- */

/** La app no manda nada: la alerta ya está en la base y se lee de ahí. */
class CanalApp implements CanalDeEnvio {
  readonly canal = CanalNotificacion.APP
  readonly disponible = true

  async enviar(): Promise<void> {
    // No hay nada que hacer: la campana y la bandeja leen las alertas.
  }
}

const CANALES: Record<CanalNotificacion, CanalDeEnvio> = {
  APP: new CanalApp(),
  EMAIL: new CanalEmail(),
  WHATSAPP: new CanalWhatsApp(),
}

export function canalesDisponibles(): CanalNotificacion[] {
  return Object.values(CANALES)
    .filter((c) => c.disponible)
    .map((c) => c.canal)
}

/* --------------------------- PROCESAMIENTO -------------------------- */

export interface ResultadoEnvio {
  enviados: number
  fallados: number
  pendientes: number
}

/**
 * Procesa la cola de notificaciones pendientes.
 * La llama el cron después de evaluar las alertas.
 */
export async function procesarPendientes(
  limite = 200,
): Promise<ResultadoEnvio> {
  const pendientes = await db.notificacionEnvio.findMany({
    where: { estado: EstadoEnvio.PENDIENTE },
    take: limite,
    include: {
      usuario: { select: { nombre: true, email: true, telefono: true } },
      alerta: {
        select: { titulo: true, detalle: true, enlace: true, estado: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  let enviados = 0
  let fallados = 0

  for (const n of pendientes) {
    // Si la alerta ya se resolvió, no tiene sentido notificarla.
    if (
      n.alerta.estado === EstadoAlerta.RESUELTA ||
      n.alerta.estado === EstadoAlerta.DESCARTADA
    ) {
      await db.notificacionEnvio.update({
        where: { id: n.id },
        data: {
          estado: EstadoEnvio.ENVIADO,
          enviadoEn: new Date(),
          error: 'La alerta se resolvió antes de enviarse.',
        },
      })
      continue
    }

    const canal = CANALES[n.canal]

    try {
      await canal.enviar({
        destinatario: n.usuario,
        asunto: n.alerta.titulo,
        cuerpo: n.alerta.detalle,
        enlace: `${base}${n.alerta.enlace ?? '/alertas'}`,
      })

      await db.notificacionEnvio.update({
        where: { id: n.id },
        data: { estado: EstadoEnvio.ENVIADO, enviadoEn: new Date() },
      })
      enviados += 1
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)

      // Un canal sin conectar no es un error de la alerta: queda
      // pendiente para cuando se conecte, no se marca como fallado.
      if (mensaje.includes('todavía no está conectado')) {
        continue
      }

      await db.notificacionEnvio.update({
        where: { id: n.id },
        data: { estado: EstadoEnvio.ERROR, error: mensaje.slice(0, 500) },
      })
      fallados += 1
    }
  }

  const quedanPendientes = await db.notificacionEnvio.count({
    where: { estado: EstadoEnvio.PENDIENTE },
  })

  return { enviados, fallados, pendientes: quedanPendientes }
}

/* ------------------------- RESUMEN DIARIO --------------------------- */

export interface ResumenDiario {
  usuarioId: string
  nombre: string
  email: string
  criticas: number
  avisos: number
  alertas: Array<{ titulo: string; detalle: string; enlace: string | null }>
}

/**
 * El resumen diario de cada usuario con sus alertas abiertas.
 *
 * Está listo para enviarse: lo único que falta es conectar el canal.
 * Mientras tanto se puede mirar desde la pantalla de configuración.
 */
export async function armarResumenDiario(): Promise<ResumenDiario[]> {
  const notificaciones = await db.notificacionEnvio.findMany({
    where: {
      canal: CanalNotificacion.APP,
      alerta: { estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] } },
    },
    include: {
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      alerta: {
        select: { titulo: true, detalle: true, enlace: true, severidad: true },
      },
    },
  })

  const porUsuario = new Map<string, ResumenDiario>()

  for (const n of notificaciones) {
    if (!n.usuario.activo) continue

    const actual = porUsuario.get(n.usuarioId) ?? {
      usuarioId: n.usuarioId,
      nombre: n.usuario.nombre,
      email: n.usuario.email,
      criticas: 0,
      avisos: 0,
      alertas: [],
    }

    if (n.alerta.severidad === 'CRITICA') actual.criticas += 1
    else actual.avisos += 1

    actual.alertas.push({
      titulo: n.alerta.titulo,
      detalle: n.alerta.detalle,
      enlace: n.alerta.enlace,
    })

    porUsuario.set(n.usuarioId, actual)
  }

  return [...porUsuario.values()].sort((a, b) => b.criticas - a.criticas)
}
