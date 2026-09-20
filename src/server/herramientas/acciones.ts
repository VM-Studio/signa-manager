'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  Condicion,
  EstadoHerramienta,
  EstadoSolicitudHerramienta,
  Prioridad,
  Prisma,
  TipoControlHerramienta,
  TipoMantenimiento,
  TipoMovimientoHerramienta,
} from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import { reevaluarModulos } from '@/lib/alertas/motor'
import {
  aplicarMovimiento,
  cambiosDeStock,
  dondeBuscarExistencia,
  validarMovimiento,
  type AccionHerramienta,
  type DatosMovimiento,
} from './movimientos'

export interface Resultado {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  mensaje?: string
  /** La devolución vino en mala condición: se ofrece mandarla al taller. */
  sugerirReparacion?: boolean
  /** Id creado, para redirigir. */
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

/* ====================== MOVIMIENTO DE HERRAMIENTA ==================== */

/**
 * Toda acción sobre una herramienta pasa por acá.
 *
 * El movimiento, el estado, la ubicación, el responsable y la fecha de
 * devolución se escriben dentro de una sola transacción: o queda todo
 * coherente o no queda nada.
 */
export async function accionMoverHerramienta(
  herramientaId: string,
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.crear')

  const herramienta = await db.herramienta.findUnique({
    where: { id: herramientaId },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      tipoControl: true,
      depositoId: true,
      obraId: true,
    },
  })
  if (!herramienta) return { error: 'Esa herramienta no existe.' }

  const movimiento: DatosMovimiento = {
    accion: String(datos.get('accion') ?? '') as AccionHerramienta,
    obraDestinoId: opcional(datos.get('obraDestinoId')),
    depositoDestinoId: opcional(datos.get('depositoDestinoId')),
    empleadoId: opcional(datos.get('empleadoId')),
    fechaDevolucionPrevista: fecha(datos.get('fechaDevolucionPrevista')),
    condicion: (opcional(datos.get('condicion')) as Condicion | null) ?? null,
    observaciones: opcional(datos.get('observaciones')),
    cantidad: Number(datos.get('cantidad') ?? 1),
  }

  const validacion = validarMovimiento(herramienta, movimiento)
  if (!validacion.ok) return { error: validacion.error }

  const plan = aplicarMovimiento(herramienta, movimiento)

  try {
    await db.$transaction(async (tx) => {
      await tx.movimientoHerramienta.create({
        data: {
          herramientaId,
          tipo: plan.movimiento.tipo,
          fecha: new Date(),
          cantidad: plan.movimiento.cantidad,
          condicion: plan.movimiento.condicion,
          fechaDevolucionPrevista: plan.movimiento.fechaDevolucionPrevista,
          observaciones: plan.movimiento.observaciones,
          origenDepositoId: plan.movimiento.origenDepositoId,
          origenObraId: plan.movimiento.origenObraId,
          destinoDepositoId: plan.movimiento.destinoDepositoId,
          destinoObraId: plan.movimiento.destinoObraId,
          registradoPorId: sesion.usuarioId,
          recibidoPorId: plan.movimiento.recibidoPorId,
          solicitudId: opcional(datos.get('solicitudId')),
        },
      })

      if (herramienta.tipoControl === TipoControlHerramienta.UNITARIO) {
        await tx.herramienta.update({
          where: { id: herramientaId },
          data: plan.herramienta,
        })
      } else {
        // Por cantidad: el stock vive en ExistenciaHerramienta y la
        // herramienta no cambia de ubicación.
        for (const cambio of cambiosDeStock(herramientaId, herramienta, movimiento)) {
          const existente = await tx.existenciaHerramienta.findFirst({
            where: dondeBuscarExistencia(cambio),
            select: { id: true, cantidad: true },
          })

          const nueva = (existente?.cantidad ?? 0) + cambio.delta
          if (nueva < 0) {
            throw new Error(
              `No hay stock suficiente: quedan ${existente?.cantidad ?? 0} unidades y se quieren mover ${Math.abs(cambio.delta)}.`,
            )
          }

          if (existente) {
            await tx.existenciaHerramienta.update({
              where: { id: existente.id },
              data: { cantidad: nueva },
            })
          } else if (cambio.delta > 0) {
            await tx.existenciaHerramienta.create({
              data: {
                herramientaId: cambio.herramientaId,
                depositoId: cambio.depositoId,
                obraId: cambio.obraId,
                cantidad: cambio.delta,
              },
            })
          }
        }
      }
    })
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el movimiento.',
    }
  }

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'EDITAR',
    entidad: 'Herramienta',
    entidadId: herramientaId,
    antes: { estado: herramienta.estado, obraId: herramienta.obraId, depositoId: herramienta.depositoId },
    despues: { accion: movimiento.accion, estado: plan.herramienta.estado },
  })

  // La alerta de devolución vencida tiene que desaparecer ahora, no en
  // la próxima corrida del cron.
  await reevaluarModulos(['herramientas'])

  revalidatePath('/herramientas')
  revalidatePath(`/herramientas/${herramientaId}`)
  revalidatePath('/inicio')
  revalidatePath('/alertas')

  return {
    ok: true,
    mensaje: mensajeDe(movimiento.accion, herramienta.nombre),
    sugerirReparacion: plan.sugerirReparacion,
  }
}

function mensajeDe(accion: AccionHerramienta, nombre: string): string {
  switch (accion) {
    case 'ENTREGAR': return `${nombre} entregada`
    case 'DEVOLVER': return `${nombre} devuelta`
    case 'TRANSFERIR': return `${nombre} transferida`
    case 'ENVIAR_A_REPARACION': return `${nombre} enviada al taller`
    case 'VOLVIO_DE_REPARACION': return `${nombre} volvió del taller`
    case 'MARCAR_EXTRAVIADA': return `${nombre} marcada como extraviada`
    case 'DAR_DE_BAJA': return `${nombre} dada de baja`
  }
}

/* ------------------ ENTREGA EN LOTE (carga continua) ---------------- */

/**
 * Modo "carga continua" del pañolero: escanea varias herramientas
 * seguidas y las entrega todas juntas a la misma obra y persona.
 */
export async function accionEntregarVarias(
  herramientaIds: string[],
  obraId: string,
  empleadoId: string | null,
  fechaDevolucion: string | null,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.crear')

  if (herramientaIds.length === 0) {
    return { error: 'No escaneaste ninguna herramienta.' }
  }

  const herramientas = await db.herramienta.findMany({
    where: { id: { in: herramientaIds } },
    select: {
      id: true, codigo: true, nombre: true, estado: true,
      tipoControl: true, depositoId: true, obraId: true,
    },
  })

  const noDisponibles = herramientas.filter(
    (h) => h.estado !== EstadoHerramienta.DISPONIBLE,
  )
  if (noDisponibles.length > 0) {
    return {
      error: `No se pueden entregar: ${noDisponibles.map((h) => h.codigo).join(', ')}. No están disponibles.`,
    }
  }

  const devolucion = fechaDevolucion
    ? new Date(`${fechaDevolucion}T00:00:00`)
    : null

  await db.$transaction(async (tx) => {
    for (const h of herramientas) {
      const plan = aplicarMovimiento(h, {
        accion: 'ENTREGAR',
        obraDestinoId: obraId,
        empleadoId,
        fechaDevolucionPrevista: devolucion,
      })

      await tx.movimientoHerramienta.create({
        data: {
          herramientaId: h.id,
          tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
          fecha: new Date(),
          condicion: Condicion.BUENA,
          fechaDevolucionPrevista: devolucion,
          origenDepositoId: h.depositoId,
          destinoObraId: obraId,
          registradoPorId: sesion.usuarioId,
          recibidoPorId: empleadoId,
          observaciones: 'Entrega en lote desde el escáner.',
        },
      })

      await tx.herramienta.update({
        where: { id: h.id },
        data: plan.herramienta,
      })
    }
  })

  revalidatePath('/herramientas')
  revalidatePath('/inicio')

  return {
    ok: true,
    mensaje: `${herramientas.length} herramienta${herramientas.length === 1 ? '' : 's'} entregada${herramientas.length === 1 ? '' : 's'}`,
  }
}

/* ========================= ALTA Y EDICIÓN =========================== */

const esquemaHerramienta = z.object({
  codigo: z.string().trim().min(3, 'El código es obligatorio.'),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio.'),
  categoriaId: z.string().trim().min(1, 'Elegí una categoría.'),
  tipoControl: z.nativeEnum(TipoControlHerramienta),
  marca: z.string().trim().nullable().transform((v) => v || null),
  modelo: z.string().trim().nullable().transform((v) => v || null),
  nroSerie: z.string().trim().nullable().transform((v) => v || null),
  notas: z.string().trim().nullable().transform((v) => v || null),
})

export async function accionGuardarHerramienta(
  id: string | null,
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, id ? 'herramientas.editar' : 'herramientas.crear')

  const validado = esquemaHerramienta.safeParse({
    codigo: String(datos.get('codigo') ?? '').toUpperCase(),
    nombre: datos.get('nombre'),
    categoriaId: datos.get('categoriaId'),
    tipoControl: datos.get('tipoControl') || TipoControlHerramienta.UNITARIO,
    marca: datos.get('marca') ?? '',
    modelo: datos.get('modelo') ?? '',
    nroSerie: datos.get('nroSerie') ?? '',
    notas: datos.get('notas') ?? '',
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const repetido = await db.herramienta.findUnique({
    where: { codigo: validado.data.codigo },
    select: { id: true },
  })
  if (repetido && repetido.id !== id) {
    return { errores: { codigo: 'Ya hay una herramienta con ese código.' } }
  }

  const numero = (v: FormDataEntryValue | null): number | null => {
    const t = opcional(v)
    if (!t) return null
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const decimal = (n: number | null) =>
    n === null ? null : new Prisma.Decimal(n.toFixed(2))

  const mantenimientoCadaDias = numero(datos.get('mantenimientoCadaDias'))
  const fechaCompra = fecha(datos.get('fechaCompra'))

  const comunes = {
    ...validado.data,
    fechaCompra,
    valorCompra: decimal(numero(datos.get('valorCompra'))),
    proveedor: opcional(datos.get('proveedor')),
    costoDiarioImputable: decimal(numero(datos.get('costoDiarioImputable'))),
    mantenimientoCadaDias: mantenimientoCadaDias
      ? Math.round(mantenimientoCadaDias)
      : null,
  }

  if (id) {
    await db.herramienta.update({ where: { id }, data: comunes })
    await registrarAuditoria({
      usuarioId: sesion.usuarioId,
      accion: 'EDITAR',
      entidad: 'Herramienta',
      entidadId: id,
      despues: { codigo: comunes.codigo, nombre: comunes.nombre },
    })
    revalidatePath(`/herramientas/${id}`)
    revalidatePath('/herramientas')
    return { ok: true, mensaje: 'Herramienta guardada', id }
  }

  const depositoId = opcional(datos.get('depositoId'))

  const creada = await db.$transaction(async (tx) => {
    const h = await tx.herramienta.create({
      data: {
        ...comunes,
        estado: EstadoHerramienta.DISPONIBLE,
        condicion: Condicion.BUENA,
        // Las unitarias entran al depósito; las de cantidad no tienen
        // ubicación propia, su stock vive en ExistenciaHerramienta.
        depositoId:
          comunes.tipoControl === TipoControlHerramienta.UNITARIO
            ? depositoId
            : null,
        proximoMantenimiento:
          comunes.mantenimientoCadaDias && fechaCompra
            ? new Date(
                fechaCompra.getTime() +
                  comunes.mantenimientoCadaDias * 86_400_000,
              )
            : null,
      },
    })

    await tx.movimientoHerramienta.create({
      data: {
        herramientaId: h.id,
        tipo: TipoMovimientoHerramienta.ALTA,
        fecha: new Date(),
        condicion: Condicion.BUENA,
        destinoDepositoId: depositoId,
        registradoPorId: sesion.usuarioId,
        observaciones: 'Alta de inventario.',
      },
    })

    if (comunes.tipoControl === TipoControlHerramienta.CANTIDAD) {
      const cantidad = Number(datos.get('cantidadInicial') ?? 0)
      if (cantidad > 0 && depositoId) {
        await tx.existenciaHerramienta.create({
          data: { herramientaId: h.id, depositoId, cantidad },
        })
      }
    }

    return h
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Herramienta',
    entidadId: creada.id,
    despues: { codigo: creada.codigo, nombre: creada.nombre },
  })

  revalidatePath('/herramientas')
  return { ok: true, mensaje: 'Herramienta creada', id: creada.id }
}

/* ========================= ALTA MASIVA CSV ========================== */

export interface FilaCsv {
  fila: number
  codigo: string
  nombre: string
  categoria: string
  marca: string | null
  modelo: string | null
  nroSerie: string | null
  valorCompra: number | null
  costoDiarioImputable: number | null
  errores: string[]
}

/** Valida un CSV antes de confirmar. No escribe nada. */
export async function accionPrevisualizarCsv(
  contenido: string,
): Promise<{ filas: FilaCsv[]; validas: number; conError: number }> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.crear')

  const [categorias, existentes] = await Promise.all([
    db.categoriaHerramienta.findMany({ select: { id: true, nombre: true } }),
    db.herramienta.findMany({ select: { codigo: true } }),
  ])

  const normalizar = (t: string) =>
    t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

  const categoriaPorNombre = new Map(
    categorias.map((c) => [normalizar(c.nombre), c.id]),
  )
  const codigosUsados = new Set(existentes.map((h) => h.codigo))
  const codigosDelArchivo = new Set<string>()

  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lineas.length < 2) {
    return { filas: [], validas: 0, conError: 0 }
  }

  const separador = lineas[0].includes(';') ? ';' : ','
  const encabezados = lineas[0].split(separador).map((h) => normalizar(h))

  const indice = (...alias: string[]) => {
    for (const a of alias) {
      const i = encabezados.indexOf(normalizar(a))
      if (i >= 0) return i
    }
    return -1
  }

  const cols = {
    codigo: indice('codigo', 'código'),
    nombre: indice('nombre', 'descripcion', 'descripción'),
    categoria: indice('categoria', 'categoría', 'rubro'),
    marca: indice('marca'),
    modelo: indice('modelo'),
    nroSerie: indice('nro serie', 'numero de serie', 'nº serie', 'serie'),
    valorCompra: indice('valor', 'valor de compra', 'precio'),
    costoDiario: indice('costo diario', 'costo diario imputable'),
  }

  const numero = (t: string | undefined): number | null => {
    if (!t) return null
    const limpio = t.replace(/[^\d.,\-]/g, '')
    if (!limpio) return null
    const ultimaComa = limpio.lastIndexOf(',')
    const ultimoPunto = limpio.lastIndexOf('.')
    const normalizado =
      ultimaComa > ultimoPunto
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '')
    const n = Number(normalizado)
    return Number.isFinite(n) ? n : null
  }

  const filas: FilaCsv[] = lineas.slice(1).map((linea, i) => {
    const celdas = linea.split(separador).map((c) => c.trim().replace(/^"|"$/g, ''))
    const errores: string[] = []

    const codigo = (celdas[cols.codigo] ?? '').toUpperCase()
    const nombre = celdas[cols.nombre] ?? ''
    const categoria = celdas[cols.categoria] ?? ''

    if (!codigo) errores.push('Falta el código')
    else if (codigosUsados.has(codigo)) errores.push('Ese código ya existe en el sistema')
    else if (codigosDelArchivo.has(codigo)) errores.push('Ese código está repetido en el archivo')
    else codigosDelArchivo.add(codigo)

    if (!nombre) errores.push('Falta el nombre')
    if (!categoria) errores.push('Falta la categoría')
    else if (!categoriaPorNombre.has(normalizar(categoria))) {
      errores.push(`La categoría "${categoria}" no existe`)
    }

    return {
      fila: i + 2,
      codigo,
      nombre,
      categoria,
      marca: celdas[cols.marca] || null,
      modelo: celdas[cols.modelo] || null,
      nroSerie: celdas[cols.nroSerie] || null,
      valorCompra: numero(celdas[cols.valorCompra]),
      costoDiarioImputable: numero(celdas[cols.costoDiario]),
      errores,
    }
  })

  return {
    filas,
    validas: filas.filter((f) => f.errores.length === 0).length,
    conError: filas.filter((f) => f.errores.length > 0).length,
  }
}

/** Confirma la carga masiva: solo se insertan las filas sin errores. */
export async function accionImportarCsv(
  filas: FilaCsv[],
  depositoId: string,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.crear')

  const validas = filas.filter((f) => f.errores.length === 0)
  if (validas.length === 0) return { error: 'No hay filas válidas para cargar.' }

  const categorias = await db.categoriaHerramienta.findMany({
    select: { id: true, nombre: true },
  })
  const normalizar = (t: string) =>
    t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const categoriaPorNombre = new Map(
    categorias.map((c) => [normalizar(c.nombre), c.id]),
  )

  await db.$transaction(async (tx) => {
    for (const f of validas) {
      const h = await tx.herramienta.create({
        data: {
          codigo: f.codigo,
          nombre: f.nombre,
          marca: f.marca,
          modelo: f.modelo,
          nroSerie: f.nroSerie,
          categoriaId: categoriaPorNombre.get(normalizar(f.categoria)) as string,
          tipoControl: TipoControlHerramienta.UNITARIO,
          estado: EstadoHerramienta.DISPONIBLE,
          condicion: Condicion.BUENA,
          depositoId,
          valorCompra:
            f.valorCompra !== null
              ? new Prisma.Decimal(f.valorCompra.toFixed(2))
              : null,
          costoDiarioImputable:
            f.costoDiarioImputable !== null
              ? new Prisma.Decimal(f.costoDiarioImputable.toFixed(2))
              : null,
        },
      })

      await tx.movimientoHerramienta.create({
        data: {
          herramientaId: h.id,
          tipo: TipoMovimientoHerramienta.ALTA,
          fecha: new Date(),
          condicion: Condicion.BUENA,
          destinoDepositoId: depositoId,
          registradoPorId: sesion.usuarioId,
          observaciones: 'Alta masiva desde archivo.',
        },
      })
    }
  })

  revalidatePath('/herramientas')
  return {
    ok: true,
    mensaje: `${validas.length} herramientas cargadas`,
  }
}

/* =========================== SOLICITUDES ============================ */

const esquemaSolicitud = z.object({
  obraId: z.string().trim().min(1, 'Elegí la obra.'),
  descripcion: z.string().trim().min(3, 'Contá qué necesitás.'),
  cantidad: z.coerce.number().int().min(1, 'Poné al menos 1.'),
  prioridad: z.nativeEnum(Prioridad),
})

export async function accionCrearSolicitud(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.crear')

  const validado = esquemaSolicitud.safeParse({
    obraId: datos.get('obraId'),
    descripcion: datos.get('descripcion'),
    cantidad: datos.get('cantidad') || 1,
    prioridad: datos.get('prioridad') || Prioridad.NORMAL,
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const fechaNecesaria = fecha(datos.get('fechaNecesaria'))
  if (!fechaNecesaria) {
    return { errores: { fechaNecesaria: 'Poné para cuándo la necesitás.' } }
  }

  const solicitud = await db.solicitudHerramienta.create({
    data: {
      ...validado.data,
      fechaNecesaria,
      categoriaId: opcional(datos.get('categoriaId')),
      solicitanteId: sesion.usuarioId,
      estado: EstadoSolicitudHerramienta.PENDIENTE,
    },
  })

  revalidatePath('/herramientas/solicitudes')
  revalidatePath('/inicio')
  return { ok: true, mensaje: 'Solicitud enviada al pañol', id: solicitud.id }
}

/**
 * Resolver con stock: se entregan las herramientas elegidas y la
 * solicitud queda como resuelta. Acá se cuenta la compra evitada.
 */
export async function accionResolverConStock(
  solicitudId: string,
  herramientaIds: string[],
  empleadoId: string | null,
  nota: string,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.aprobar')

  if (herramientaIds.length === 0) {
    return { error: 'Elegí al menos una herramienta.' }
  }

  const solicitud = await db.solicitudHerramienta.findUnique({
    where: { id: solicitudId },
    select: { id: true, obraId: true, estado: true },
  })
  if (!solicitud) return { error: 'Esa solicitud no existe.' }
  if (solicitud.estado !== EstadoSolicitudHerramienta.PENDIENTE) {
    return { error: 'Esa solicitud ya está resuelta.' }
  }

  const herramientas = await db.herramienta.findMany({
    where: { id: { in: herramientaIds } },
    select: {
      id: true, codigo: true, nombre: true, estado: true,
      tipoControl: true, depositoId: true, obraId: true,
    },
  })

  try {
    await db.$transaction(async (tx) => {
      for (const h of herramientas) {
        // Si estaba en otra obra, es una transferencia; si estaba en el
        // depósito, una salida a obra.
        const accion: AccionHerramienta =
          h.estado === EstadoHerramienta.EN_OBRA ? 'TRANSFERIR' : 'ENTREGAR'

        const movimiento: DatosMovimiento = {
          accion,
          obraDestinoId: solicitud.obraId,
          empleadoId,
          observaciones: `Resuelta la solicitud con stock propio. ${nota}`.trim(),
        }

        const validacion = validarMovimiento(h, movimiento)
        if (!validacion.ok) throw new Error(`${h.codigo}: ${validacion.error}`)

        const plan = aplicarMovimiento(h, movimiento)

        await tx.movimientoHerramienta.create({
          data: {
            herramientaId: h.id,
            tipo: plan.movimiento.tipo,
            fecha: new Date(),
            condicion: Condicion.BUENA,
            origenDepositoId: plan.movimiento.origenDepositoId,
            origenObraId: plan.movimiento.origenObraId,
            destinoObraId: solicitud.obraId,
            registradoPorId: sesion.usuarioId,
            recibidoPorId: empleadoId,
            observaciones: plan.movimiento.observaciones,
            solicitudId,
          },
        })

        await tx.herramienta.update({
          where: { id: h.id },
          data: plan.herramienta,
        })
      }

      await tx.solicitudHerramienta.update({
        where: { id: solicitudId },
        data: {
          estado: EstadoSolicitudHerramienta.RESUELTA_CON_STOCK,
          resueltaPorId: sesion.usuarioId,
          resueltaEn: new Date(),
          resolucionNota:
            nota.trim() ||
            `Se resolvió con ${herramientas.length} herramienta${herramientas.length === 1 ? '' : 's'} que ya teníamos.`,
        },
      })
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo resolver.',
    }
  }

  await reevaluarModulos(['herramientas'])

  revalidatePath('/herramientas/solicitudes')
  revalidatePath('/inicio')
  revalidatePath('/alertas')
  return {
    ok: true,
    mensaje: `Resuelta con ${herramientas.length} herramienta${herramientas.length === 1 ? '' : 's'} propia${herramientas.length === 1 ? '' : 's'}`,
  }
}

export async function accionCerrarSolicitud(
  solicitudId: string,
  estado: 'DERIVADA_A_COMPRA' | 'RECHAZADA' | 'CANCELADA',
  nota: string,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.aprobar')

  if (!nota.trim()) {
    return { error: 'Escribí por qué, así la obra entiende la decisión.' }
  }

  await db.solicitudHerramienta.update({
    where: { id: solicitudId },
    data: {
      estado: estado as EstadoSolicitudHerramienta,
      resueltaPorId: sesion.usuarioId,
      resueltaEn: new Date(),
      resolucionNota: nota.trim(),
    },
  })

  revalidatePath('/herramientas/solicitudes')
  return {
    ok: true,
    mensaje:
      estado === 'DERIVADA_A_COMPRA'
        ? 'Derivada a compra'
        : estado === 'RECHAZADA'
          ? 'Solicitud rechazada'
          : 'Solicitud cancelada',
  }
}

/* ========================== MANTENIMIENTO =========================== */

export async function accionRegistrarMantenimiento(
  herramientaId: string,
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'herramientas.editar')

  const tipo = String(datos.get('tipo') ?? '') as TipoMantenimiento
  const descripcion = opcional(datos.get('descripcion'))
  const fechaMantenimiento = fecha(datos.get('fecha')) ?? new Date()

  if (!descripcion) {
    return { errores: { descripcion: 'Contá qué se le hizo.' } }
  }

  const herramienta = await db.herramienta.findUnique({
    where: { id: herramientaId },
    select: { mantenimientoCadaDias: true },
  })

  const costoTexto = opcional(datos.get('costo'))
  const costo = costoTexto
    ? Number(costoTexto.replace(/\./g, '').replace(',', '.'))
    : null

  // Al guardar uno preventivo se recalcula la próxima fecha según la
  // frecuencia de la herramienta.
  const proximaFecha =
    tipo === TipoMantenimiento.PREVENTIVO && herramienta?.mantenimientoCadaDias
      ? new Date(
          fechaMantenimiento.getTime() +
            herramienta.mantenimientoCadaDias * 86_400_000,
        )
      : null

  await db.$transaction(async (tx) => {
    await tx.mantenimientoHerramienta.create({
      data: {
        herramientaId,
        tipo,
        fecha: fechaMantenimiento,
        descripcion,
        proveedor: opcional(datos.get('proveedor')),
        costo:
          costo !== null && Number.isFinite(costo)
            ? new Prisma.Decimal(costo.toFixed(2))
            : null,
        proximaFecha,
      },
    })

    if (proximaFecha) {
      await tx.herramienta.update({
        where: { id: herramientaId },
        data: { proximoMantenimiento: proximaFecha },
      })
    }
  })

  revalidatePath(`/herramientas/${herramientaId}`)
  revalidatePath('/herramientas/mantenimiento')
  return { ok: true, mensaje: 'Mantenimiento registrado' }
}
