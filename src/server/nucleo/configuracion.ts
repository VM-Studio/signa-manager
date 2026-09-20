'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Rol } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { registrarAuditoria } from './auditoria'

/* =====================================================================
   Configuración: unidades de negocio, depósitos y usuarios.

   Todas las bajas son lógicas (regla de CLAUDE.md): nada se borra, se
   desactiva. Un depósito borrado se llevaría puesto el historial de
   movimientos de cien herramientas.
   ===================================================================== */

export interface EstadoAccion {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  /** Para mostrar un aviso después de una acción que salió bien. */
  mensaje?: string
}

function aErrores(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const problema of error.issues) {
    const campo = problema.path[0]
    if (typeof campo === 'string' && !salida[campo]) {
      salida[campo] = problema.message
    }
  }
  return salida
}

/* ====================== UNIDADES DE NEGOCIO ========================= */

const esquemaUnidad = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  codigo: z
    .string()
    .trim()
    .min(2, 'El código es obligatorio.')
    .regex(/^[A-Z0-9_]+$/, 'Usá solo mayúsculas, números y guión bajo.'),
  orden: z.coerce.number().int().min(0).default(0),
})

export async function accionGuardarUnidad(
  id: string | null,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  const validado = esquemaUnidad.safeParse({
    nombre: datos.get('nombre'),
    codigo: String(datos.get('codigo') ?? '').toUpperCase(),
    orden: datos.get('orden') || 0,
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const repetido = await db.unidadNegocio.findUnique({
    where: { codigo: validado.data.codigo },
    select: { id: true },
  })
  if (repetido && repetido.id !== id) {
    return { errores: { codigo: 'Ya existe una unidad con ese código.' } }
  }

  const unidad = id
    ? await db.unidadNegocio.update({ where: { id }, data: validado.data })
    : await db.unidadNegocio.create({ data: validado.data })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: id ? 'EDITAR' : 'CREAR',
    entidad: 'UnidadNegocio',
    entidadId: unidad.id,
    despues: { nombre: unidad.nombre, codigo: unidad.codigo },
  })

  revalidatePath('/mas/unidades')
  return { ok: true, mensaje: id ? 'Unidad guardada' : 'Unidad creada' }
}

export async function accionActivarUnidad(
  id: string,
  activa: boolean,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  if (!activa) {
    // No se desactiva una unidad que todavía tiene obras en curso: el
    // tablero quedaría con obras colgando de una unidad invisible.
    const enCurso = await db.obra.count({
      where: { unidadNegocioId: id, estado: { in: ['EN_CURSO', 'PLANIFICADA'] } },
    })
    if (enCurso > 0) {
      return {
        error: `No se puede desactivar: tiene ${enCurso} obra${enCurso === 1 ? '' : 's'} en curso o planificada${enCurso === 1 ? '' : 's'}.`,
      }
    }
  }

  await db.unidadNegocio.update({ where: { id }, data: { activa } })
  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: activa ? 'ACTIVAR' : 'DESACTIVAR',
    entidad: 'UnidadNegocio',
    entidadId: id,
  })

  revalidatePath('/mas/unidades')
  return { ok: true, mensaje: activa ? 'Unidad activada' : 'Unidad desactivada' }
}

/* ============================ DEPÓSITOS ============================= */

const esquemaDeposito = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  direccion: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  responsableId: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

export async function accionGuardarDeposito(
  id: string | null,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.editar')

  const validado = esquemaDeposito.safeParse({
    nombre: datos.get('nombre'),
    direccion: datos.get('direccion') ?? '',
    responsableId: datos.get('responsableId') ?? '',
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const repetido = await db.deposito.findUnique({
    where: { nombre: validado.data.nombre },
    select: { id: true },
  })
  if (repetido && repetido.id !== id) {
    return { errores: { nombre: 'Ya existe un depósito con ese nombre.' } }
  }

  const deposito = id
    ? await db.deposito.update({ where: { id }, data: validado.data })
    : await db.deposito.create({ data: validado.data })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: id ? 'EDITAR' : 'CREAR',
    entidad: 'Deposito',
    entidadId: deposito.id,
    despues: { nombre: deposito.nombre },
  })

  revalidatePath('/mas/depositos')
  return { ok: true, mensaje: id ? 'Depósito guardado' : 'Depósito creado' }
}

export async function accionActivarDeposito(
  id: string,
  activo: boolean,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.editar')

  if (!activo) {
    const conHerramientas = await db.herramienta.count({ where: { depositoId: id } })
    if (conHerramientas > 0) {
      return {
        error: `No se puede desactivar: todavía tiene ${conHerramientas} herramienta${conHerramientas === 1 ? '' : 's'} adentro. Movelas primero.`,
      }
    }
  }

  await db.deposito.update({ where: { id }, data: { activo } })
  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: activo ? 'ACTIVAR' : 'DESACTIVAR',
    entidad: 'Deposito',
    entidadId: id,
  })

  revalidatePath('/mas/depositos')
  return { ok: true, mensaje: activo ? 'Depósito activado' : 'Depósito desactivado' }
}

/* ============================= USUARIOS ============================= */

const esquemaUsuario = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El email es obligatorio.')
    .email('Ese email no tiene el formato correcto.'),
  rol: z.nativeEnum(Rol),
  telefono: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  empleadoId: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})

const CLAVE_MINIMA = 8

export async function accionCrearUsuario(
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.crear')

  const validado = esquemaUsuario.safeParse({
    nombre: datos.get('nombre'),
    email: datos.get('email'),
    rol: datos.get('rol'),
    telefono: datos.get('telefono') ?? '',
    empleadoId: datos.get('empleadoId') ?? '',
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const contrasena = String(datos.get('contrasena') ?? '')
  if (contrasena.length < CLAVE_MINIMA) {
    return {
      errores: {
        contrasena: `La contraseña tiene que tener al menos ${CLAVE_MINIMA} caracteres.`,
      },
    }
  }

  const repetido = await db.usuario.findUnique({
    where: { email: validado.data.email },
    select: { id: true },
  })
  if (repetido) {
    return { errores: { email: 'Ya hay un usuario con ese email.' } }
  }

  if (validado.data.empleadoId) {
    const yaVinculado = await db.usuario.findUnique({
      where: { empleadoId: validado.data.empleadoId },
      select: { id: true },
    })
    if (yaVinculado) {
      return {
        errores: { empleadoId: 'Ese empleado ya está vinculado a otro usuario.' },
      }
    }
  }

  const usuario = await db.usuario.create({
    data: {
      ...validado.data,
      passwordHash: await bcrypt.hash(contrasena, 10),
    },
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Usuario',
    entidadId: usuario.id,
    despues: { email: usuario.email, rol: usuario.rol },
  })

  revalidatePath('/mas/usuarios')
  return { ok: true, mensaje: 'Usuario creado' }
}

export async function accionEditarUsuario(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.editar')

  const validado = esquemaUsuario.safeParse({
    nombre: datos.get('nombre'),
    email: datos.get('email'),
    rol: datos.get('rol'),
    telefono: datos.get('telefono') ?? '',
    empleadoId: datos.get('empleadoId') ?? '',
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const actual = await db.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, rol: true, empleadoId: true },
  })
  if (!actual) return { error: 'Ese usuario no existe.' }

  if (validado.data.email !== actual.email) {
    const repetido = await db.usuario.findUnique({
      where: { email: validado.data.email },
      select: { id: true },
    })
    if (repetido) return { errores: { email: 'Ya hay un usuario con ese email.' } }
  }

  if (
    validado.data.empleadoId &&
    validado.data.empleadoId !== actual.empleadoId
  ) {
    const yaVinculado = await db.usuario.findUnique({
      where: { empleadoId: validado.data.empleadoId },
      select: { id: true },
    })
    if (yaVinculado) {
      return {
        errores: { empleadoId: 'Ese empleado ya está vinculado a otro usuario.' },
      }
    }
  }

  // El dueño no se puede dejar sin dueños: si este es el último DUENO
  // activo y le cambian el rol, la configuración quedaría inaccesible.
  if (actual.rol === Rol.DUENO && validado.data.rol !== Rol.DUENO) {
    const otrosDuenos = await db.usuario.count({
      where: { rol: Rol.DUENO, activo: true, id: { not: id } },
    })
    if (otrosDuenos === 0) {
      return {
        error: 'Es el único dueño activo. Asigná otro dueño antes de cambiarle el rol.',
      }
    }
  }

  await db.usuario.update({ where: { id }, data: validado.data })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: id,
    antes: { rol: actual.rol, email: actual.email },
    despues: { rol: validado.data.rol, email: validado.data.email },
  })

  revalidatePath('/mas/usuarios')
  return { ok: true, mensaje: 'Usuario guardado' }
}

export async function accionRestablecerContrasena(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.editar')

  const contrasena = String(datos.get('contrasena') ?? '')
  if (contrasena.length < CLAVE_MINIMA) {
    return {
      errores: {
        contrasena: `La contraseña tiene que tener al menos ${CLAVE_MINIMA} caracteres.`,
      },
    }
  }

  await db.usuario.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(contrasena, 10) },
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Usuario',
    entidadId: id,
    despues: { contrasenaRestablecida: true },
  })

  revalidatePath('/mas/usuarios')
  return { ok: true, mensaje: 'Contraseña restablecida' }
}

export async function accionActivarUsuario(
  id: string,
  activo: boolean,
): Promise<EstadoAccion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.editar')

  if (id === sesion.usuarioId && !activo) {
    return { error: 'No podés desactivar tu propio usuario.' }
  }

  if (!activo) {
    const usuario = await db.usuario.findUnique({
      where: { id },
      select: { rol: true },
    })
    if (usuario?.rol === Rol.DUENO) {
      const otrosDuenos = await db.usuario.count({
        where: { rol: Rol.DUENO, activo: true, id: { not: id } },
      })
      if (otrosDuenos === 0) {
        return { error: 'Es el único dueño activo. No se puede desactivar.' }
      }
    }
  }

  await db.usuario.update({ where: { id }, data: { activo } })
  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: activo ? 'ACTIVAR' : 'DESACTIVAR',
    entidad: 'Usuario',
    entidadId: id,
  })

  revalidatePath('/mas/usuarios')
  return { ok: true, mensaje: activo ? 'Usuario activado' : 'Usuario desactivado' }
}
