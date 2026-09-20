'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  CategoriaLaboral,
  Prisma,
  RubroSubcontratista,
  TipoDocumentoEmpleado,
  TipoDocumentoSubcontratista,
} from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import {
  categoriaDeTexto,
  conflictosDeCuadrilla,
  cuilValido,
  fechaDeTexto,
  normalizarTexto,
  numeroDeTexto,
} from './reglas'

/* =====================================================================
   Altas y ediciones del módulo de personal.
   ===================================================================== */

export interface ResultadoPersonal {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  mensaje?: string
  id?: string
}

function aErrores(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const p of error.issues) {
    const campo = p.path[0]
    if (typeof campo === 'string' && !salida[campo]) salida[campo] = p.message
  }
  return salida
}

const opcional = (v: FormDataEntryValue | null): string | null => {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

const fecha = (v: FormDataEntryValue | null): Date | null => {
  const t = opcional(v)
  if (!t) return null
  const d = new Date(`${t}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const numero = (v: FormDataEntryValue | null): number | null => {
  const t = opcional(v)
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const decimal = (n: number | null) =>
  n === null ? null : new Prisma.Decimal(n.toFixed(2))

/* ---------------------------- EMPLEADO ------------------------------ */

const esquemaEmpleado = z.object({
  legajo: z.string().trim().min(1, 'El legajo es obligatorio.'),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(2, 'El apellido es obligatorio.'),
  dni: z
    .string()
    .trim()
    .min(7, 'El DNI tiene que tener al menos 7 dígitos.')
    .regex(/^\d+$/, 'El DNI va sin puntos ni letras.'),
  categoria: z.nativeEnum(CategoriaLaboral),
})

export async function accionGuardarEmpleado(
  id: string | null,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, id ? 'personal.editar' : 'personal.crear')

  const validado = esquemaEmpleado.safeParse({
    legajo: datos.get('legajo'),
    nombre: datos.get('nombre'),
    apellido: datos.get('apellido'),
    dni: String(datos.get('dni') ?? '').replace(/\D/g, ''),
    categoria: datos.get('categoria'),
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const cuil = opcional(datos.get('cuil'))
  if (cuil && !cuilValido(cuil)) {
    return { errores: { cuil: 'Ese CUIL no es válido. Revisá los números.' } }
  }

  const valorHora = numero(datos.get('valorHora'))
  if (!id && (valorHora === null || valorHora <= 0)) {
    return { errores: { valorHora: 'Poné el valor hora.' } }
  }

  const fechaIngreso = fecha(datos.get('fechaIngreso'))
  if (!id && !fechaIngreso) {
    return { errores: { fechaIngreso: 'Poné la fecha de ingreso.' } }
  }

  // El legajo y el DNI no se pueden repetir.
  const [porLegajo, porDni] = await Promise.all([
    db.empleado.findUnique({
      where: { legajo: validado.data.legajo },
      select: { id: true },
    }),
    db.empleado.findUnique({
      where: { dni: validado.data.dni },
      select: { id: true },
    }),
  ])
  if (porLegajo && porLegajo.id !== id) {
    return { errores: { legajo: 'Ya hay alguien con ese legajo.' } }
  }
  if (porDni && porDni.id !== id) {
    return { errores: { dni: 'Ya hay alguien con ese DNI.' } }
  }

  const comunes = {
    ...validado.data,
    cuil: cuil ? cuil.replace(/\D/g, '') : null,
    telefono: opcional(datos.get('telefono')),
    direccion: opcional(datos.get('direccion')),
    localidad: opcional(datos.get('localidad')),
    especialidad: opcional(datos.get('especialidad')),
    talleRopa: opcional(datos.get('talleRopa')),
    talleCalzado: opcional(datos.get('talleCalzado')),
    contactoEmergenciaNombre: opcional(datos.get('contactoEmergenciaNombre')),
    contactoEmergenciaTelefono: opcional(
      datos.get('contactoEmergenciaTelefono'),
    ),
    notas: opcional(datos.get('notas')),
  }

  if (id) {
    // El valor hora NO se toca acá: tiene su propia acción, porque
    // cambiarlo exige motivo y fecha de vigencia.
    await db.empleado.update({ where: { id }, data: comunes })

    await registrarAuditoria({
      usuarioId: sesion.usuarioId,
      accion: 'EDITAR',
      entidad: 'Empleado',
      entidadId: id,
      despues: { legajo: comunes.legajo },
    })

    revalidatePath(`/personal/empleados/${id}`)
    revalidatePath('/personal/empleados')
    return { ok: true, id, mensaje: 'Empleado guardado' }
  }

  const creado = await db.$transaction(async (tx) => {
    const empleado = await tx.empleado.create({
      data: {
        ...comunes,
        fechaIngreso: fechaIngreso as Date,
        valorHora: decimal(valorHora) as Prisma.Decimal,
      },
    })

    // El alta abre el historial de valor hora: si no, el primer cambio
    // no tendría contra qué compararse.
    await tx.historialValorHora.create({
      data: {
        empleadoId: empleado.id,
        valorHora: decimal(valorHora) as Prisma.Decimal,
        desde: fechaIngreso as Date,
        motivo: 'Valor de ingreso',
      },
    })

    return empleado
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Empleado',
    entidadId: creado.id,
    despues: { legajo: creado.legajo, nombre: `${creado.nombre} ${creado.apellido}` },
  })

  revalidatePath('/personal/empleados')
  return { ok: true, id: creado.id, mensaje: 'Empleado creado' }
}

/**
 * Cambiar el valor hora.
 *
 * Regla de CLAUDE.md: siempre crea un HistorialValorHora, y los partes
 * ya aprobados no cambian porque tienen el costo congelado.
 */
export async function accionCambiarValorHora(
  empleadoId: string,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const nuevo = numero(datos.get('valorHora'))
  if (nuevo === null || nuevo <= 0) {
    return { errores: { valorHora: 'Poné el valor hora nuevo.' } }
  }

  const motivo = opcional(datos.get('motivo'))
  if (!motivo) {
    return {
      errores: { motivo: 'Escribí el motivo: paritaria, recategorización…' },
    }
  }

  const desde = fecha(datos.get('desde'))
  if (!desde) {
    return { errores: { desde: 'Poné desde cuándo rige.' } }
  }

  const empleado = await db.empleado.findUnique({
    where: { id: empleadoId },
    select: { valorHora: true, nombre: true, apellido: true },
  })
  if (!empleado) return { error: 'Ese empleado no existe.' }

  const anterior = Number(empleado.valorHora)
  if (Math.abs(anterior - nuevo) < 0.01) {
    return { errores: { valorHora: 'Ese es el mismo valor que ya tiene.' } }
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  await db.$transaction(async (tx) => {
    await tx.historialValorHora.create({
      data: {
        empleadoId,
        valorHora: decimal(nuevo) as Prisma.Decimal,
        desde,
        motivo,
      },
    })

    // El valor del empleado solo se actualiza si el cambio ya rige.
    // Si es a futuro, lo va a tomar el parte cuando llegue la fecha.
    if (desde <= hoy) {
      await tx.empleado.update({
        where: { id: empleadoId },
        data: { valorHora: decimal(nuevo) as Prisma.Decimal },
      })
    }
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Empleado',
    entidadId: empleadoId,
    antes: { valorHora: anterior },
    despues: { valorHora: nuevo, motivo, desde: desde.toISOString() },
  })

  revalidatePath(`/personal/empleados/${empleadoId}`)

  const variacion = ((nuevo - anterior) / anterior) * 100
  return {
    ok: true,
    mensaje:
      desde > hoy
        ? `Valor hora agendado para el ${desde.toLocaleDateString('es-AR')}`
        : `Valor hora actualizado (${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%)`,
  }
}

export async function accionActivarEmpleado(
  id: string,
  activo: boolean,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  if (!activo) {
    const ahora = new Date()
    const asignado = await db.asignacionObra.count({
      where: {
        empleadoId: id,
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
    })
    if (asignado > 0) {
      return {
        error: 'Está asignado a una obra. Sacalo de la obra antes de darlo de baja.',
      }
    }

    const herramientas = await db.herramienta.count({
      where: { responsableActualId: id, estado: 'EN_OBRA' },
    })
    if (herramientas > 0) {
      return {
        error: `Tiene ${herramientas} herramienta${herramientas === 1 ? '' : 's'} a cargo. Hay que devolverlas primero.`,
      }
    }
  }

  await db.empleado.update({
    where: { id },
    data: {
      activo,
      fechaEgreso: activo ? null : new Date(),
    },
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: activo ? 'ACTIVAR' : 'DESACTIVAR',
    entidad: 'Empleado',
    entidadId: id,
  })

  revalidatePath('/personal/empleados')
  revalidatePath(`/personal/empleados/${id}`)
  return { ok: true, mensaje: activo ? 'Empleado reactivado' : 'Empleado dado de baja' }
}

/* ------------------------ DOCUMENTOS Y EPP -------------------------- */

export async function accionGuardarDocumentoEmpleado(
  empleadoId: string,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const vencimiento = fecha(datos.get('vencimiento'))
  if (!vencimiento) {
    return { errores: { vencimiento: 'Poné la fecha de vencimiento.' } }
  }

  await db.documentoEmpleado.create({
    data: {
      empleadoId,
      tipo: String(datos.get('tipo') ?? 'OTRO') as TipoDocumentoEmpleado,
      descripcion: opcional(datos.get('descripcion')),
      emision: fecha(datos.get('emision')),
      vencimiento,
    },
  })

  revalidatePath(`/personal/empleados/${empleadoId}`)
  return { ok: true, mensaje: 'Documento cargado' }
}

export async function accionBorrarDocumentoEmpleado(
  documentoId: string,
  empleadoId: string,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  await db.documentoEmpleado.delete({ where: { id: documentoId } })

  revalidatePath(`/personal/empleados/${empleadoId}`)
  return { ok: true, mensaje: 'Documento borrado' }
}

export async function accionRegistrarEpp(
  empleadoId: string,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const elemento = opcional(datos.get('elemento'))
  if (!elemento) {
    return { errores: { elemento: 'Poné qué se le entregó.' } }
  }

  await db.entregaEpp.create({
    data: {
      empleadoId,
      elemento,
      marca: opcional(datos.get('marca')),
      cantidad: Math.max(1, Number(datos.get('cantidad') ?? 1)),
      fecha: fecha(datos.get('fecha')) ?? new Date(),
      // La constancia firmada es lo que pide la Res. SRT 299/11.
      firmado: datos.get('firmado') === 'on',
    },
  })

  revalidatePath(`/personal/empleados/${empleadoId}`)
  return { ok: true, mensaje: 'Entrega registrada' }
}

/* -------------------------- SUBCONTRATISTA -------------------------- */

const esquemaSubcontratista = z.object({
  razonSocial: z.string().trim().min(2, 'La razón social es obligatoria.'),
  cuit: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIT va con 11 dígitos, sin guiones.'),
  rubro: z.nativeEnum(RubroSubcontratista),
})

export async function accionGuardarSubcontratista(
  id: string | null,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, id ? 'personal.editar' : 'personal.crear')

  const validado = esquemaSubcontratista.safeParse({
    razonSocial: datos.get('razonSocial'),
    cuit: String(datos.get('cuit') ?? '').replace(/\D/g, ''),
    rubro: datos.get('rubro'),
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  if (!cuilValido(validado.data.cuit)) {
    return { errores: { cuit: 'Ese CUIT no es válido. Revisá los números.' } }
  }

  const repetido = await db.subcontratista.findUnique({
    where: { cuit: validado.data.cuit },
    select: { id: true },
  })
  if (repetido && repetido.id !== id) {
    return { errores: { cuit: 'Ya hay un subcontratista con ese CUIT.' } }
  }

  const comunes = {
    ...validado.data,
    contacto: opcional(datos.get('contacto')),
    telefono: opcional(datos.get('telefono')),
    email: opcional(datos.get('email')),
    notas: opcional(datos.get('notas')),
  }

  const guardado = id
    ? await db.subcontratista.update({ where: { id }, data: comunes })
    : await db.subcontratista.create({ data: comunes })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: id ? 'EDITAR' : 'CREAR',
    entidad: 'Subcontratista',
    entidadId: guardado.id,
    despues: { razonSocial: guardado.razonSocial },
  })

  revalidatePath('/personal/subcontratistas')
  return {
    ok: true,
    id: guardado.id,
    mensaje: id ? 'Subcontratista guardado' : 'Subcontratista creado',
  }
}

export async function accionGuardarDocumentoSubcontratista(
  subcontratistaId: string,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const vencimiento = fecha(datos.get('vencimiento'))
  if (!vencimiento) {
    return { errores: { vencimiento: 'Poné la fecha de vencimiento.' } }
  }

  await db.documentoSubcontratista.create({
    data: {
      subcontratistaId,
      tipo: String(datos.get('tipo') ?? 'OTRO') as TipoDocumentoSubcontratista,
      descripcion: opcional(datos.get('descripcion')),
      vencimiento,
    },
  })

  revalidatePath(`/personal/subcontratistas/${subcontratistaId}`)
  return { ok: true, mensaje: 'Documento cargado' }
}

export async function accionActivarSubcontratista(
  id: string,
  activo: boolean,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  await db.subcontratista.update({ where: { id }, data: { activo } })

  revalidatePath('/personal/subcontratistas')
  return { ok: true, mensaje: activo ? 'Reactivado' : 'Dado de baja' }
}

/* ---------------------------- CUADRILLA ----------------------------- */

export async function accionGuardarCuadrilla(
  id: string | null,
  _previo: ResultadoPersonal,
  datos: FormData,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, id ? 'personal.editar' : 'personal.crear')

  const nombre = opcional(datos.get('nombre'))
  if (!nombre) return { errores: { nombre: 'Poné el nombre de la cuadrilla.' } }

  const repetida = await db.cuadrilla.findUnique({
    where: { nombre },
    select: { id: true },
  })
  if (repetida && repetida.id !== id) {
    return { errores: { nombre: 'Ya hay una cuadrilla con ese nombre.' } }
  }

  const capatazId = opcional(datos.get('capatazId'))
  const miembros = datos.getAll('miembros').map(String).filter(Boolean)

  /*
   * Regla de CLAUDE.md: un empleado puede estar en una sola cuadrilla
   * activa. Se revisa antes de guardar y se dice quién está dónde.
   */
  if (miembros.length > 0) {
    const yaEnOtra = await db.cuadrillaMiembro.findMany({
      where: {
        empleadoId: { in: miembros },
        cuadrilla: { activa: true, ...(id ? { id: { not: id } } : {}) },
      },
      select: {
        empleadoId: true,
        empleado: { select: { nombre: true, apellido: true } },
        cuadrilla: { select: { nombre: true } },
      },
    })

    const conflictos = conflictosDeCuadrilla(
      yaEnOtra.map((m) => ({
        empleadoId: m.empleadoId,
        nombre: `${m.empleado.nombre} ${m.empleado.apellido}`,
        cuadrillaActiva: m.cuadrilla.nombre,
      })),
      miembros,
    )

    if (conflictos.length > 0) {
      const lista = conflictos
        .map((c) => `${c.empleado} (${c.cuadrilla})`)
        .join(', ')
      return {
        error: `Estas personas ya están en otra cuadrilla: ${lista}. Sacalas de ahí primero.`,
      }
    }
  }

  const guardada = await db.$transaction(async (tx) => {
    const cuadrilla = id
      ? await tx.cuadrilla.update({
          where: { id },
          data: { nombre, capatazId },
        })
      : await tx.cuadrilla.create({ data: { nombre, capatazId } })

    // Los miembros se reemplazan enteros: son cinco o seis filas.
    await tx.cuadrillaMiembro.deleteMany({ where: { cuadrillaId: cuadrilla.id } })
    if (miembros.length > 0) {
      await tx.cuadrillaMiembro.createMany({
        data: miembros.map((empleadoId) => ({
          cuadrillaId: cuadrilla.id,
          empleadoId,
        })),
      })
    }

    return cuadrilla
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: id ? 'EDITAR' : 'CREAR',
    entidad: 'Cuadrilla',
    entidadId: guardada.id,
    despues: { nombre, miembros: miembros.length },
  })

  revalidatePath('/personal/cuadrillas')
  return {
    ok: true,
    id: guardada.id,
    mensaje: id ? 'Cuadrilla guardada' : 'Cuadrilla creada',
  }
}

export async function accionActivarCuadrilla(
  id: string,
  activa: boolean,
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  await db.cuadrilla.update({ where: { id }, data: { activa } })

  revalidatePath('/personal/cuadrillas')
  return { ok: true, mensaje: activa ? 'Cuadrilla activada' : 'Cuadrilla desactivada' }
}

/* ===================== ALTA MASIVA DESDE CSV ========================
   Misma mecánica que en herramientas: primero se previsualiza todo el
   archivo y se muestran los errores fila por fila, y recién después se
   confirma. Nunca se importa "lo que se pueda" sin que lo vean.
   ==================================================================== */

export interface FilaEmpleadoCsv {
  fila: number
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string | null
  categoria: string
  especialidad: string | null
  telefono: string | null
  localidad: string | null
  valorHora: number | null
  fechaIngreso: string | null
  errores: string[]
}

export async function accionPrevisualizarEmpleadosCsv(
  contenido: string,
): Promise<{ filas: FilaEmpleadoCsv[]; validas: number; conError: number }> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.crear')

  const existentes = await db.empleado.findMany({
    select: { legajo: true, dni: true },
  })
  const legajosUsados = new Set(existentes.map((e) => e.legajo))
  const dnisUsados = new Set(existentes.map((e) => e.dni))
  const legajosDelArchivo = new Set<string>()
  const dnisDelArchivo = new Set<string>()

  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lineas.length < 2) return { filas: [], validas: 0, conError: 0 }

  const separador = lineas[0].includes(';') ? ';' : ','
  const encabezados = lineas[0].split(separador).map(normalizarTexto)

  const indice = (...alias: string[]) => {
    for (const a of alias) {
      const i = encabezados.indexOf(normalizarTexto(a))
      if (i >= 0) return i
    }
    return -1
  }

  const cols = {
    legajo: indice('legajo', 'nro legajo', 'n legajo'),
    nombre: indice('nombre', 'nombres'),
    apellido: indice('apellido', 'apellidos'),
    dni: indice('dni', 'documento'),
    cuil: indice('cuil', 'cuit'),
    categoria: indice('categoria', 'categoría', 'puesto'),
    especialidad: indice('especialidad', 'oficio'),
    telefono: indice('telefono', 'teléfono', 'celular'),
    localidad: indice('localidad', 'ciudad'),
    valorHora: indice('valor hora', 'valorhora', 'jornal', 'sueldo hora'),
    fechaIngreso: indice('fecha ingreso', 'ingreso', 'fecha de ingreso'),
  }

  const celda = (celdas: string[], i: number) =>
    i >= 0 ? (celdas[i] ?? '').trim() : ''

  const filas: FilaEmpleadoCsv[] = lineas.slice(1).map((linea, i) => {
    const celdas = linea
      .split(separador)
      .map((c) => c.trim().replace(/^"|"$/g, ''))
    const errores: string[] = []

    const legajo = celda(celdas, cols.legajo)
    const nombre = celda(celdas, cols.nombre)
    const apellido = celda(celdas, cols.apellido)
    const dni = celda(celdas, cols.dni).replace(/\D/g, '')
    const cuil = celda(celdas, cols.cuil).replace(/\D/g, '')
    const categoria = celda(celdas, cols.categoria)
    const valorHora = numeroDeTexto(celda(celdas, cols.valorHora))
    const fechaIngresoTexto = celda(celdas, cols.fechaIngreso)
    const fechaIngreso = fechaDeTexto(fechaIngresoTexto)

    if (!legajo) errores.push('Falta el legajo')
    else if (legajosUsados.has(legajo)) errores.push('Ese legajo ya existe en el sistema')
    else if (legajosDelArchivo.has(legajo)) errores.push('Ese legajo está repetido en el archivo')
    else legajosDelArchivo.add(legajo)

    if (!nombre) errores.push('Falta el nombre')
    if (!apellido) errores.push('Falta el apellido')

    if (!dni) errores.push('Falta el DNI')
    else if (dni.length < 7) errores.push('El DNI es muy corto')
    else if (dnisUsados.has(dni)) errores.push('Ese DNI ya existe en el sistema')
    else if (dnisDelArchivo.has(dni)) errores.push('Ese DNI está repetido en el archivo')
    else dnisDelArchivo.add(dni)

    if (cuil && !cuilValido(cuil)) errores.push('El CUIL no es válido')

    if (!categoria) errores.push('Falta la categoría')
    else if (!categoriaDeTexto(categoria)) {
      errores.push(`La categoría "${categoria}" no la reconozco`)
    }

    if (valorHora === null) errores.push('Falta el valor hora')
    else if (valorHora <= 0) errores.push('El valor hora tiene que ser mayor a cero')

    if (!fechaIngresoTexto) errores.push('Falta la fecha de ingreso')
    else if (!fechaIngreso) errores.push('La fecha de ingreso no se entiende')

    return {
      fila: i + 2,
      legajo,
      nombre,
      apellido,
      dni,
      cuil: cuil || null,
      categoria,
      especialidad: celda(celdas, cols.especialidad) || null,
      telefono: celda(celdas, cols.telefono) || null,
      localidad: celda(celdas, cols.localidad) || null,
      valorHora,
      fechaIngreso: fechaIngreso ? fechaIngreso.toISOString() : null,
      errores,
    }
  })

  return {
    filas,
    validas: filas.filter((f) => f.errores.length === 0).length,
    conError: filas.filter((f) => f.errores.length > 0).length,
  }
}

export async function accionImportarEmpleadosCsv(
  filas: FilaEmpleadoCsv[],
): Promise<ResultadoPersonal> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.crear')

  const validas = filas.filter((f) => f.errores.length === 0)
  if (validas.length === 0) return { error: 'No hay filas válidas para cargar.' }

  await db.$transaction(async (tx) => {
    for (const f of validas) {
      const categoria = categoriaDeTexto(f.categoria)
      const fechaIngreso = new Date(f.fechaIngreso as string)
      const valorHora = decimal(f.valorHora) as Prisma.Decimal

      const empleado = await tx.empleado.create({
        data: {
          legajo: f.legajo,
          nombre: f.nombre,
          apellido: f.apellido,
          dni: f.dni,
          cuil: f.cuil,
          telefono: f.telefono,
          localidad: f.localidad,
          categoria: categoria as CategoriaLaboral,
          especialidad: f.especialidad,
          valorHora,
          fechaIngreso,
        },
      })

      await tx.historialValorHora.create({
        data: {
          empleadoId: empleado.id,
          valorHora,
          desde: fechaIngreso,
          motivo: 'Valor de ingreso (carga masiva)',
        },
      })
    }
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Empleado',
    entidadId: 'carga-masiva',
    despues: { cantidad: validas.length },
  })

  revalidatePath('/personal/empleados')
  return {
    ok: true,
    mensaje: `${validas.length} ${validas.length === 1 ? 'empleado cargado' : 'empleados cargados'}`,
  }
}
