import { Rol } from '@prisma/client'
import { NOMBRE_ROL } from '@/lib/auth/permisos'
import { fechaConDia, primeraMayuscula } from '@/lib/formato'

/** Quién sos y qué día es. En obra se comparte el teléfono y sirve. */
export function Saludo({ nombre, rol }: { nombre: string; rol: Rol }) {
  const hora = new Date().getHours()
  const momento =
    hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const primerNombre = nombre.split(' ')[0]

  return (
    <div className="border-b border-niebla bg-blanco px-4 py-4">
      <p className="text-titulo font-medium text-negro">
        {momento}, {primerNombre}
      </p>
      <p className="mt-0.5 text-menor text-grafito">
        {NOMBRE_ROL[rol]} · {primeraMayuscula(fechaConDia(new Date()))}
      </p>
    </div>
  )
}
