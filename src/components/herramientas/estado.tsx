import { EstadoHerramienta } from '@prisma/client'
import { Insignia, type TonoInsignia } from '@/components/ui'

export const ESTADO_HERRAMIENTA: Record<
  EstadoHerramienta,
  { texto: string; tono: TonoInsignia }
> = {
  DISPONIBLE: { texto: 'Disponible', tono: 'correcto' },
  EN_OBRA: { texto: 'En obra', tono: 'neutro' },
  EN_REPARACION: { texto: 'En reparación', tono: 'aviso' },
  EXTRAVIADA: { texto: 'Extraviada', tono: 'critico' },
  BAJA: { texto: 'De baja', tono: 'neutro' },
}

export function InsigniaEstadoHerramienta({
  estado,
}: {
  estado: EstadoHerramienta
}) {
  const { texto, tono } = ESTADO_HERRAMIENTA[estado]
  return <Insignia tono={tono}>{texto}</Insignia>
}

export const CONDICION_TEXTO = {
  BUENA: 'Buena',
  REGULAR: 'Regular',
  MALA: 'Mala',
} as const

export const MOVIMIENTO_TEXTO = {
  ALTA: 'Alta de inventario',
  SALIDA_A_OBRA: 'Entregada a obra',
  DEVOLUCION: 'Devuelta al depósito',
  TRANSFERENCIA: 'Transferida de obra',
  ENVIO_A_REPARACION: 'Enviada a reparación',
  RETORNO_DE_REPARACION: 'Volvió de reparación',
  EXTRAVIO: 'Marcada como extraviada',
  BAJA: 'Dada de baja',
} as const
