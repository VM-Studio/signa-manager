'use server'

import { revalidatePath } from 'next/cache'
import { OrigenDato } from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { exigirAccesoAObra } from '@/lib/auth/obras'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import {
  aErrores,
  camposAActualizar,
  camposDelSistemaBase,
  camposPropios,
  decimal,
} from './reglas'

/* =====================================================================
   Altas y ediciones de obra.
   Las reglas de qué se puede editar están en `reglas.ts`, que es lo que
   se prueba. Acá van los permisos, la base y la auditoría.
   ===================================================================== */

export interface EstadoFormulario {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
}

/* ------------------------------ ALTA -------------------------------- */

export async function accionCrearObra(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'obras.crear')

  const crudo = Object.fromEntries(datos.entries())
  const base = camposDelSistemaBase.safeParse(crudo)
  const propios = camposPropios.safeParse(crudo)

  if (!base.success || !propios.success) {
    return {
      errores: {
        ...(base.success ? {} : aErrores(base.error)),
        ...(propios.success ? {} : aErrores(propios.error)),
      },
    }
  }

  const repetido = await db.obra.findUnique({
    where: { codigo: base.data.codigo },
    select: { id: true },
  })
  if (repetido) {
    return { errores: { codigo: 'Ya existe una obra con ese código.' } }
  }

  const obra = await db.obra.create({
    data: {
      codigo: base.data.codigo,
      nombre: base.data.nombre,
      tipo: base.data.tipo,
      estado: base.data.estado,
      cliente: base.data.cliente,
      unidadNegocioId: base.data.unidadNegocioId,
      presupuestoTotal: decimal(base.data.presupuestoTotal),
      fechaInicio: base.data.fechaInicio,
      fechaFinPrevista: base.data.fechaFinPrevista,
      fechaFinReal: base.data.fechaFinReal,
      jefeObraId: propios.data.jefeObraId,
      presupuestoManoObra: decimal(propios.data.presupuestoManoObra),
      direccion: propios.data.direccion,
      localidad: propios.data.localidad,
      provincia: propios.data.provincia,
      esInterior: propios.data.esInterior === 'on',
      // Creada a mano: la sincronización la va a adoptar si aparece en el
      // sistema base con el mismo código.
      origen: OrigenDato.MANUAL,
    },
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Obra',
    entidadId: obra.id,
    despues: { codigo: obra.codigo, nombre: obra.nombre },
  })

  revalidatePath('/obras')
  return { ok: true }
}

/* ----------------------------- EDICIÓN ------------------------------ */

export async function accionEditarObra(
  obraId: string,
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'obras.editar')
  await exigirAccesoAObra(sesion, obraId)

  const actual = await db.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      codigo: true,
      origen: true,
      jefeObraId: true,
      presupuestoManoObra: true,
      esInterior: true,
    },
  })
  if (!actual) return { error: 'Esa obra no existe.' }

  const crudo = Object.fromEntries(datos.entries())
  const resultado = camposAActualizar(actual.origen, crudo)
  if (!resultado.ok) return { errores: resultado.errores }

  // El código es único: si se está cambiando, hay que chequearlo.
  const codigoNuevo = resultado.datos.codigo
  if (typeof codigoNuevo === 'string' && codigoNuevo !== actual.codigo) {
    const repetido = await db.obra.findUnique({
      where: { codigo: codigoNuevo },
      select: { id: true },
    })
    if (repetido) {
      return { errores: { codigo: 'Ya existe otra obra con ese código.' } }
    }
  }

  await db.obra.update({ where: { id: obraId }, data: resultado.datos })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Obra',
    entidadId: obraId,
    antes: {
      jefeObraId: actual.jefeObraId,
      presupuestoManoObra: actual.presupuestoManoObra?.toString() ?? null,
      esInterior: actual.esInterior,
    },
    despues: {
      origen: actual.origen,
      camposTocados: Object.keys(resultado.datos),
    },
  })

  revalidatePath('/obras')
  revalidatePath(`/obras/${obraId}`)
  return { ok: true }
}
