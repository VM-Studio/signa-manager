'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import {
  MODULOS,
  exigirPermiso,
  rolVeModulo,
  type Modulo,
} from '@/lib/auth/permisos'
import { registrarAuditoria } from '@/server/nucleo/auditoria'

/* =====================================================================
   Accesos por persona.

   El rol sigue siendo la base. Acá solo se guardan las excepciones: qué
   módulo se le abrió o se le cerró a alguien a mano. Si para un módulo
   no hay fila, manda el rol.

   Se guarda únicamente lo que DIFIERE del rol. Si el dueño marca un
   módulo que el rol ya daba, la fila se borra en vez de guardarse en
   true: así, el día que se cambie la matriz de roles, esa persona
   acompaña el cambio en lugar de quedar congelada con una excepción que
   nadie recuerda haber puesto.
   ===================================================================== */

export interface ResultadoAcceso {
  ok?: boolean
  error?: string
  mensaje?: string
}

export async function accionGuardarAccesos(
  usuarioId: string,
  modulosVisibles: string[],
): Promise<ResultadoAcceso> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  /*
   * Nadie se edita a sí mismo.
   *
   * Sin esto, el dueño se puede sacar Configuración de un clic y queda
   * afuera de la única pantalla desde la que podría devolvérselo. La
   * app no tiene forma de arreglarlo salvo tocando la base a mano.
   */
  if (usuarioId === sesion.usuarioId) {
    return {
      error:
        'No podés cambiar tus propios accesos. Pedíselo a otro usuario con acceso a Configuración.',
    }
  }

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nombre: true, rol: true },
  })
  if (!usuario) return { error: 'Ese usuario no existe.' }

  const elegidos = new Set(modulosVisibles)

  // Solo se guarda lo que no coincide con lo que da el rol.
  const excepciones = MODULOS.flatMap((modulo) => {
    const loQuiere = elegidos.has(modulo)
    const loDaElRol = rolVeModulo(usuario.rol, modulo as Modulo)
    return loQuiere === loDaElRol ? [] : [{ modulo, permitido: loQuiere }]
  })

  await db.$transaction(async (tx) => {
    await tx.accesoUsuario.deleteMany({ where: { usuarioId } })
    if (excepciones.length > 0) {
      await tx.accesoUsuario.createMany({
        data: excepciones.map((e) => ({ ...e, usuarioId })),
      })
    }
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuarioId,
    despues: {
      accesos: Object.fromEntries(
        excepciones.map((e) => [e.modulo, e.permitido]),
      ),
    },
  })

  /*
   * Se revalida todo: los accesos cambian qué ve la barra lateral, que
   * está en el layout de la app entera.
   */
  revalidatePath('/', 'layout')

  return {
    ok: true,
    mensaje:
      excepciones.length === 0
        ? `${usuario.nombre} vuelve a los accesos de su rol`
        : `Accesos de ${usuario.nombre} guardados`,
  }
}

/** Devolver a alguien a lo que le da su rol, sin excepciones. */
export async function accionVolverAlRol(
  usuarioId: string,
): Promise<ResultadoAcceso> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  if (usuarioId === sesion.usuarioId) {
    return { error: 'No podés cambiar tus propios accesos.' }
  }

  await db.accesoUsuario.deleteMany({ where: { usuarioId } })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: usuarioId,
    despues: { accesos: 'los del rol' },
  })

  revalidatePath('/', 'layout')
  return { ok: true, mensaje: 'Volvió a los accesos de su rol' }
}
