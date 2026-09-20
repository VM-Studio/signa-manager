import { EstadoObra, OrigenDato, Prisma, TipoObra } from '@prisma/client'
import { z } from 'zod'

/* =====================================================================
   Reglas de edición de una obra.

   Está aparte de `acciones.ts` porque ese archivo es 'use server' y solo
   puede exportar funciones async. Acá viven las reglas puras, que es lo
   que se puede probar sin levantar medio Next.

   La regla que importa: si la obra viene del sistema base, sus campos NO
   se tocan, venga lo que venga en el formulario.
   ===================================================================== */

const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

const numeroOpcional = z
  .string()
  .trim()
  .transform((v) =>
    v === '' ? null : Number(v.replace(/\./g, '').replace(',', '.')),
  )
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
    message: 'Tiene que ser un número mayor o igual a cero.',
  })

const fechaOpcional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : new Date(`${v}T00:00:00`)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), {
    message: 'Esa fecha no es válida.',
  })

/** Los campos que son NUESTROS: se editan siempre, venga de donde venga la obra. */
export const camposPropios = z.object({
  jefeObraId: textoOpcional,
  presupuestoManoObra: numeroOpcional,
  direccion: textoOpcional,
  localidad: textoOpcional,
  provincia: textoOpcional,
  esInterior: z.union([z.literal('on'), z.literal('')]).optional(),
})

/** Los campos del SISTEMA BASE: solo se editan si la obra es manual. */
export const camposDelSistemaBase = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código es obligatorio.')
    .min(3, 'El código tiene que tener al menos 3 caracteres.'),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .min(3, 'El nombre tiene que tener al menos 3 caracteres.'),
  tipo: z.nativeEnum(TipoObra),
  estado: z.nativeEnum(EstadoObra),
  cliente: textoOpcional,
  unidadNegocioId: z.string().trim().min(1, 'Elegí una unidad de negocio.'),
  presupuestoTotal: numeroOpcional,
  fechaInicio: fechaOpcional,
  fechaFinPrevista: fechaOpcional,
  fechaFinReal: fechaOpcional,
})

export type CamposPropios = z.infer<typeof camposPropios>
export type CamposDelSistemaBase = z.infer<typeof camposDelSistemaBase>

/** Los errores de Zod, aplanados a un mensaje por campo. */
export function aErrores(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const problema of error.issues) {
    const campo = problema.path[0]
    if (typeof campo === 'string' && !salida[campo]) {
      salida[campo] = problema.message
    }
  }
  return salida
}

export function decimal(valor: number | null): Prisma.Decimal | null {
  return valor === null ? null : new Prisma.Decimal(valor.toFixed(2))
}

export type ResultadoCampos =
  | { ok: true; datos: Prisma.ObraUpdateInput }
  | { ok: false; errores: Record<string, string> }

/**
 * Qué se le manda a Prisma al editar una obra.
 *
 * Esta es LA función que decide qué se guarda y qué se ignora. Recibe el
 * formulario crudo y el origen de la obra, y devuelve solo lo que
 * corresponde tocar.
 */
export function camposAActualizar(
  origen: OrigenDato,
  crudo: Record<string, unknown>,
): ResultadoCampos {
  const propios = camposPropios.safeParse(crudo)
  if (!propios.success) return { ok: false, errores: aErrores(propios.error) }

  const datos: Prisma.ObraUpdateInput = {
    jefeObra: propios.data.jefeObraId
      ? { connect: { id: propios.data.jefeObraId } }
      : { disconnect: true },
    presupuestoManoObra: decimal(propios.data.presupuestoManoObra),
    direccion: propios.data.direccion,
    localidad: propios.data.localidad,
    provincia: propios.data.provincia,
    esInterior: propios.data.esInterior === 'on',
  }

  /*
   * Acá está la regla. Si la obra viene de Lebane o de Sorby, lo que
   * llegue por el formulario para estos campos se descarta: la próxima
   * sincronización lo pisaría igual, así que la app no finge que se
   * guardó.
   */
  if (origen !== OrigenDato.MANUAL) {
    return { ok: true, datos }
  }

  const base = camposDelSistemaBase.safeParse(crudo)
  if (!base.success) return { ok: false, errores: aErrores(base.error) }

  return {
    ok: true,
    datos: {
      ...datos,
      codigo: base.data.codigo,
      nombre: base.data.nombre,
      tipo: base.data.tipo,
      estado: base.data.estado,
      cliente: base.data.cliente,
      unidadNegocio: { connect: { id: base.data.unidadNegocioId } },
      presupuestoTotal: decimal(base.data.presupuestoTotal),
      fechaInicio: base.data.fechaInicio,
      fechaFinPrevista: base.data.fechaFinPrevista,
      fechaFinReal: base.data.fechaFinReal,
    },
  }
}
