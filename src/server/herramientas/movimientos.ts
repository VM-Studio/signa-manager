import {
  Condicion,
  EstadoHerramienta,
  Prisma,
  TipoControlHerramienta,
  TipoMovimientoHerramienta,
} from '@prisma/client'

/* =====================================================================
   Reglas de los movimientos de herramientas.

   Está aparte de las acciones (que son 'use server') para poder probar
   las reglas sin levantar Next.

   La regla madre de CLAUDE.md: una herramienta UNITARIA está en un
   depósito O en una obra, nunca en las dos ni en ninguna, salvo
   EXTRAVIADA, BAJA o EN_REPARACION. La ubicación solo cambia creando un
   MovimientoHerramienta, dentro de una transacción.
   ===================================================================== */

export type AccionHerramienta =
  | 'ENTREGAR'
  | 'DEVOLVER'
  | 'TRANSFERIR'
  | 'ENVIAR_A_REPARACION'
  | 'VOLVIO_DE_REPARACION'
  | 'MARCAR_EXTRAVIADA'
  | 'DAR_DE_BAJA'

export interface EstadoActual {
  id: string
  codigo: string
  nombre: string
  estado: EstadoHerramienta
  tipoControl: TipoControlHerramienta
  depositoId: string | null
  obraId: string | null
}

/** Qué se puede hacer con la herramienta según cómo está hoy. */
export function accionesPosibles(h: EstadoActual): AccionHerramienta[] {
  if (h.tipoControl === TipoControlHerramienta.CANTIDAD) {
    return ['ENTREGAR', 'DEVOLVER']
  }

  switch (h.estado) {
    case EstadoHerramienta.DISPONIBLE:
      return ['ENTREGAR', 'ENVIAR_A_REPARACION', 'MARCAR_EXTRAVIADA', 'DAR_DE_BAJA']
    case EstadoHerramienta.EN_OBRA:
      return ['DEVOLVER', 'TRANSFERIR', 'MARCAR_EXTRAVIADA', 'DAR_DE_BAJA']
    case EstadoHerramienta.EN_REPARACION:
      return ['VOLVIO_DE_REPARACION', 'DAR_DE_BAJA']
    case EstadoHerramienta.EXTRAVIADA:
      return ['VOLVIO_DE_REPARACION', 'DAR_DE_BAJA']
    case EstadoHerramienta.BAJA:
      return []
  }
}

/** La acción más probable al escanear: lo que el pañolero va a querer hacer. */
export function accionMasProbable(h: EstadoActual): AccionHerramienta | null {
  if (h.estado === EstadoHerramienta.DISPONIBLE) return 'ENTREGAR'
  if (h.estado === EstadoHerramienta.EN_OBRA) return 'DEVOLVER'
  if (h.estado === EstadoHerramienta.EN_REPARACION) return 'VOLVIO_DE_REPARACION'
  return null
}

export const TEXTO_ACCION: Record<AccionHerramienta, string> = {
  ENTREGAR: 'Entregar a obra',
  DEVOLVER: 'Registrar devolución',
  TRANSFERIR: 'Transferir a otra obra',
  ENVIAR_A_REPARACION: 'Enviar a reparación',
  VOLVIO_DE_REPARACION: 'Volvió de reparación',
  MARCAR_EXTRAVIADA: 'Marcar extraviada',
  DAR_DE_BAJA: 'Dar de baja',
}

/* --------------------------- VALIDACIÓN ----------------------------- */

export interface DatosMovimiento {
  accion: AccionHerramienta
  /** Obra de destino, para entregar y transferir. */
  obraDestinoId?: string | null
  /** Depósito de destino, para devolver y volver de reparación. */
  depositoDestinoId?: string | null
  empleadoId?: string | null
  fechaDevolucionPrevista?: Date | null
  condicion?: Condicion | null
  observaciones?: string | null
  /** Solo para herramientas por cantidad. */
  cantidad?: number
}

export type Validacion = { ok: true } | { ok: false; error: string }

export function validarMovimiento(
  h: EstadoActual,
  datos: DatosMovimiento,
): Validacion {
  if (!accionesPosibles(h).includes(datos.accion)) {
    return {
      ok: false,
      error: `No se puede "${TEXTO_ACCION[datos.accion].toLowerCase()}" una herramienta que está ${textoEstado(h.estado)}.`,
    }
  }

  switch (datos.accion) {
    case 'ENTREGAR':
      // No se puede entregar algo que no está disponible.
      if (
        h.tipoControl === TipoControlHerramienta.UNITARIO &&
        h.estado !== EstadoHerramienta.DISPONIBLE
      ) {
        return {
          ok: false,
          error: `${h.codigo} no está disponible: está ${textoEstado(h.estado)}.`,
        }
      }
      if (!datos.obraDestinoId) {
        return { ok: false, error: 'Elegí a qué obra se entrega.' }
      }
      break

    case 'DEVOLVER':
      if (!datos.depositoDestinoId) {
        return { ok: false, error: 'Elegí a qué depósito vuelve.' }
      }
      if (!datos.condicion) {
        return { ok: false, error: 'Indicá en qué condición vuelve.' }
      }
      break

    case 'TRANSFERIR':
      if (!datos.obraDestinoId) {
        return { ok: false, error: 'Elegí a qué obra se transfiere.' }
      }
      // La transferencia va de obra a obra: no pasa por el depósito.
      if (datos.obraDestinoId === h.obraId) {
        return { ok: false, error: 'Ya está en esa obra.' }
      }
      break

    case 'ENVIAR_A_REPARACION':
      if (!datos.observaciones?.trim()) {
        return { ok: false, error: 'Contá qué le pasa para mandarla al taller.' }
      }
      break

    case 'VOLVIO_DE_REPARACION':
      if (!datos.depositoDestinoId) {
        return { ok: false, error: 'Elegí a qué depósito vuelve.' }
      }
      break

    case 'MARCAR_EXTRAVIADA':
    case 'DAR_DE_BAJA':
      // Baja y extravío piden motivo obligatorio.
      if (!datos.observaciones?.trim()) {
        return {
          ok: false,
          error:
            datos.accion === 'DAR_DE_BAJA'
              ? 'Escribí el motivo de la baja. Queda registrado.'
              : 'Escribí qué pasó con la herramienta. Queda registrado.',
        }
      }
      break
  }

  if (h.tipoControl === TipoControlHerramienta.CANTIDAD) {
    if (!datos.cantidad || datos.cantidad < 1) {
      return { ok: false, error: 'Poné cuántas unidades.' }
    }
  }

  return { ok: true }
}

function textoEstado(estado: EstadoHerramienta): string {
  const textos: Record<EstadoHerramienta, string> = {
    DISPONIBLE: 'disponible',
    EN_OBRA: 'en obra',
    EN_REPARACION: 'en reparación',
    EXTRAVIADA: 'extraviada',
    BAJA: 'dada de baja',
  }
  return textos[estado]
}

/* ------------------- CÓMO QUEDA DESPUÉS DEL MOVIMIENTO -------------- */

export interface ResultadoMovimiento {
  /** Cómo queda la herramienta. */
  herramienta: {
    estado: EstadoHerramienta
    depositoId: string | null
    obraId: string | null
    responsableActualId: string | null
    fechaDevolucionPrevista: Date | null
    condicion?: Condicion
  }
  /** El movimiento que hay que crear. */
  movimiento: {
    tipo: TipoMovimientoHerramienta
    origenDepositoId: string | null
    origenObraId: string | null
    destinoDepositoId: string | null
    destinoObraId: string | null
    condicion: Condicion | null
    fechaDevolucionPrevista: Date | null
    recibidoPorId: string | null
    observaciones: string | null
    cantidad: number
  }
  /** Si la devolución vino en mala condición, se ofrece mandarla al taller. */
  sugerirReparacion: boolean
}

/**
 * Calcula cómo queda todo después del movimiento.
 * No toca la base: solo dice qué hay que escribir. La transacción la
 * arma la Server Action con esto.
 */
export function aplicarMovimiento(
  h: EstadoActual,
  datos: DatosMovimiento,
): ResultadoMovimiento {
  const origenDepositoId = h.depositoId
  const origenObraId = h.obraId
  const cantidad = datos.cantidad ?? 1
  const observaciones = datos.observaciones?.trim() || null

  const base = {
    origenDepositoId,
    origenObraId,
    destinoDepositoId: null as string | null,
    destinoObraId: null as string | null,
    condicion: datos.condicion ?? null,
    fechaDevolucionPrevista: null as Date | null,
    recibidoPorId: null as string | null,
    observaciones,
    cantidad,
  }

  switch (datos.accion) {
    case 'ENTREGAR':
      return {
        herramienta: {
          estado: EstadoHerramienta.EN_OBRA,
          depositoId: null,
          obraId: datos.obraDestinoId ?? null,
          responsableActualId: datos.empleadoId ?? null,
          fechaDevolucionPrevista: datos.fechaDevolucionPrevista ?? null,
        },
        movimiento: {
          ...base,
          tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
          destinoObraId: datos.obraDestinoId ?? null,
          fechaDevolucionPrevista: datos.fechaDevolucionPrevista ?? null,
          recibidoPorId: datos.empleadoId ?? null,
        },
        sugerirReparacion: false,
      }

    case 'DEVOLVER':
      return {
        herramienta: {
          estado: EstadoHerramienta.DISPONIBLE,
          depositoId: datos.depositoDestinoId ?? null,
          obraId: null,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
          condicion: datos.condicion ?? Condicion.BUENA,
        },
        movimiento: {
          ...base,
          tipo: TipoMovimientoHerramienta.DEVOLUCION,
          destinoDepositoId: datos.depositoDestinoId ?? null,
        },
        // Si vuelve en mala condición, la pantalla ofrece mandarla directo
        // al taller en vez de dejarla como disponible.
        sugerirReparacion: datos.condicion === Condicion.MALA,
      }

    case 'TRANSFERIR':
      return {
        herramienta: {
          estado: EstadoHerramienta.EN_OBRA,
          depositoId: null,
          obraId: datos.obraDestinoId ?? null,
          responsableActualId: datos.empleadoId ?? null,
          fechaDevolucionPrevista: datos.fechaDevolucionPrevista ?? null,
        },
        movimiento: {
          ...base,
          tipo: TipoMovimientoHerramienta.TRANSFERENCIA,
          destinoObraId: datos.obraDestinoId ?? null,
          fechaDevolucionPrevista: datos.fechaDevolucionPrevista ?? null,
          recibidoPorId: datos.empleadoId ?? null,
        },
        sugerirReparacion: false,
      }

    case 'ENVIAR_A_REPARACION':
      return {
        herramienta: {
          // En el taller no está ni en depósito ni en obra.
          estado: EstadoHerramienta.EN_REPARACION,
          depositoId: null,
          obraId: null,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
          condicion: Condicion.MALA,
        },
        movimiento: {
          ...base,
          tipo: TipoMovimientoHerramienta.ENVIO_A_REPARACION,
          condicion: Condicion.MALA,
        },
        sugerirReparacion: false,
      }

    case 'VOLVIO_DE_REPARACION':
      return {
        herramienta: {
          estado: EstadoHerramienta.DISPONIBLE,
          depositoId: datos.depositoDestinoId ?? null,
          obraId: null,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
          condicion: datos.condicion ?? Condicion.BUENA,
        },
        movimiento: {
          ...base,
          tipo: TipoMovimientoHerramienta.RETORNO_DE_REPARACION,
          destinoDepositoId: datos.depositoDestinoId ?? null,
        },
        sugerirReparacion: false,
      }

    case 'MARCAR_EXTRAVIADA':
      return {
        herramienta: {
          estado: EstadoHerramienta.EXTRAVIADA,
          depositoId: null,
          obraId: null,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
        },
        movimiento: { ...base, tipo: TipoMovimientoHerramienta.EXTRAVIO },
        sugerirReparacion: false,
      }

    case 'DAR_DE_BAJA':
      return {
        herramienta: {
          estado: EstadoHerramienta.BAJA,
          depositoId: null,
          obraId: null,
          responsableActualId: null,
          fechaDevolucionPrevista: null,
        },
        movimiento: { ...base, tipo: TipoMovimientoHerramienta.BAJA },
        sugerirReparacion: false,
      }
  }
}

/* ------------------- HERRAMIENTAS POR CANTIDAD ---------------------- */

export interface CambioStock {
  herramientaId: string
  depositoId: string | null
  obraId: string | null
  delta: number
}

/**
 * Qué existencias hay que mover. Para las herramientas por cantidad el
 * movimiento descuenta de un lado y suma del otro.
 */
export function cambiosDeStock(
  herramientaId: string,
  h: EstadoActual,
  datos: DatosMovimiento,
): CambioStock[] {
  const cantidad = datos.cantidad ?? 1

  if (datos.accion === 'ENTREGAR') {
    return [
      {
        herramientaId,
        depositoId: datos.depositoDestinoId ?? null,
        obraId: null,
        delta: -cantidad,
      },
      {
        herramientaId,
        depositoId: null,
        obraId: datos.obraDestinoId ?? null,
        delta: cantidad,
      },
    ]
  }

  if (datos.accion === 'DEVOLVER') {
    return [
      {
        herramientaId,
        depositoId: null,
        obraId: datos.obraDestinoId ?? null,
        delta: -cantidad,
      },
      {
        herramientaId,
        depositoId: datos.depositoDestinoId ?? null,
        obraId: null,
        delta: cantidad,
      },
    ]
  }

  return []
}

/**
 * Busca la fila de existencia que corresponde.
 *
 * Postgres no considera iguales dos NULL en un índice único, así que el
 * `@@unique([herramientaId, depositoId, obraId])` del schema NO evita
 * filas duplicadas cuando uno de los dos es null. Por eso siempre hay
 * que buscar primero (regla de CLAUDE.md).
 */
export function dondeBuscarExistencia(
  cambio: CambioStock,
): Prisma.ExistenciaHerramientaWhereInput {
  return {
    herramientaId: cambio.herramientaId,
    depositoId: cambio.depositoId,
    obraId: cambio.obraId,
  }
}
