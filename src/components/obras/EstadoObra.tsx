import { EstadoObra } from '@prisma/client'
import { Insignia, type TonoInsignia } from '@/components/ui'

export const ESTADO_OBRA: Record<
  EstadoObra,
  { texto: string; tono: TonoInsignia }
> = {
  PLANIFICADA: { texto: 'Planificada', tono: 'neutro' },
  EN_CURSO: { texto: 'En curso', tono: 'correcto' },
  PAUSADA: { texto: 'Pausada', tono: 'aviso' },
  FINALIZADA: { texto: 'Finalizada', tono: 'neutro' },
}

export function InsigniaEstadoObra({ estado }: { estado: EstadoObra }) {
  const { texto, tono } = ESTADO_OBRA[estado]
  return <Insignia tono={tono}>{texto}</Insignia>
}
