import { Rol } from '@prisma/client'
import { exigirSesion } from '@/lib/auth/sesion'
import {
  inicioCapataz,
  inicioChofer,
  inicioLogistica,
  inicioPanolero,
  inicioRrhh,
  misObras,
  resumenEmpresa,
} from '@/server/nucleo/inicio'
import { InicioDueno } from '@/components/app/inicio/InicioDueno'
import { InicioObras } from '@/components/app/inicio/InicioObras'
import { InicioCapataz } from '@/components/app/inicio/InicioCapataz'
import { InicioPanolero } from '@/components/app/inicio/InicioPanolero'
import { InicioLogistica } from '@/components/app/inicio/InicioLogistica'
import { InicioChofer } from '@/components/app/inicio/InicioChofer'
import { InicioRrhh } from '@/components/app/inicio/InicioRrhh'
import { Saludo } from '@/components/app/inicio/Saludo'

/* =====================================================================
   El inicio cambia según el rol: cada uno ve, apenas abre la app, lo que
   tiene que resolver hoy.
   ===================================================================== */

export default async function PaginaInicio() {
  const sesion = await exigirSesion()

  return (
    <div className="pb-8">
      <Saludo nombre={sesion.nombre} rol={sesion.rol} />
      {await contenidoSegunRol(sesion.rol, sesion)}
    </div>
  )
}

async function contenidoSegunRol(
  rol: Rol,
  sesion: Awaited<ReturnType<typeof exigirSesion>>,
) {
  switch (rol) {
    case Rol.DUENO:
    case Rol.ADMINISTRACION:
      return <InicioDueno resumen={await resumenEmpresa()} rol={rol} />

    case Rol.JEFE_OBRA:
    case Rol.ARQUITECTA:
      return <InicioObras obras={await misObras(sesion)} rol={rol} />

    case Rol.CAPATAZ:
      return <InicioCapataz datos={await inicioCapataz(sesion)} />

    case Rol.PANOLERO:
      return <InicioPanolero datos={await inicioPanolero()} />

    case Rol.LOGISTICA:
      return <InicioLogistica datos={await inicioLogistica()} />

    case Rol.CHOFER:
      return <InicioChofer datos={await inicioChofer(sesion)} />

    case Rol.RRHH:
      return <InicioRrhh datos={await inicioRrhh()} />

    default:
      return null
  }
}
