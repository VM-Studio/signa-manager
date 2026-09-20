import { EsqueletoLista } from '@/components/ui'

/** Lo que se ve mientras una pantalla trae sus datos del servidor. */
export default function Cargando() {
  return (
    <div className="pt-4">
      <EsqueletoLista filas={7} />
    </div>
  )
}
