import { EncabezadoPantalla, EstadoVacio } from '@/components/ui'

/**
 * Sección que ya está en la navegación pero todavía no tiene contenido.
 * Se va reemplazando módulo por módulo. Existe para que la navegación
 * funcione completa desde el principio y nada quede en una pantalla rota.
 */
export function EnConstruccion({
  titulo,
  mensaje,
  conVolver = false,
}: {
  titulo: string
  mensaje: string
  conVolver?: boolean
}) {
  return (
    <>
      <EncabezadoPantalla titulo={titulo} sinVolver={!conVolver} />
      <EstadoVacio titulo="Todavía no está listo" mensaje={mensaje} />
    </>
  )
}
