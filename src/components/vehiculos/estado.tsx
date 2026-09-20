import { EstadoVehiculo, EstadoViaje, TipoVehiculo } from '@prisma/client'
import { Insignia, type TonoInsignia } from '@/components/ui'

export const ESTADO_VEHICULO: Record<
  EstadoVehiculo,
  { texto: string; tono: TonoInsignia }
> = {
  DISPONIBLE: { texto: 'Disponible', tono: 'correcto' },
  EN_VIAJE: { texto: 'En viaje', tono: 'neutro' },
  EN_TALLER: { texto: 'En taller', tono: 'aviso' },
  FUERA_DE_SERVICIO: { texto: 'Fuera de servicio', tono: 'critico' },
  VENDIDO: { texto: 'Vendido', tono: 'neutro' },
}

export const ESTADO_VIAJE: Record<
  EstadoViaje,
  { texto: string; tono: TonoInsignia }
> = {
  PROGRAMADO: { texto: 'Programado', tono: 'neutro' },
  EN_CURSO: { texto: 'En viaje', tono: 'correcto' },
  FINALIZADO: { texto: 'Finalizado', tono: 'neutro' },
  CANCELADO: { texto: 'Cancelado', tono: 'neutro' },
}

export const TIPO_VEHICULO: Record<TipoVehiculo, string> = {
  CAMION: 'Camión',
  CAMIONETA: 'Camioneta',
  UTILITARIO: 'Utilitario',
  AUTO: 'Auto',
  MAQUINA_VIAL: 'Máquina vial',
  ACOPLADO: 'Acoplado',
}

export function InsigniaEstadoVehiculo({ estado }: { estado: EstadoVehiculo }) {
  const { texto, tono } = ESTADO_VEHICULO[estado]
  return <Insignia tono={tono}>{texto}</Insignia>
}

export function InsigniaEstadoViaje({ estado }: { estado: EstadoViaje }) {
  const { texto, tono } = ESTADO_VIAJE[estado]
  return <Insignia tono={tono}>{texto}</Insignia>
}
