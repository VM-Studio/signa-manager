import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { db } from '@/lib/db'
import {
  calendarioDePartes,
  partesParaAprobar,
} from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { BandejaPartes } from '@/components/personal/BandejaPartes'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaPartes({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Partes diarios" />

  const { obra } = await searchParams
  const ids = await obrasDeLaSesion(sesion)

  const [partes, obras] = await Promise.all([
    partesParaAprobar(sesion),
    db.obra.findMany({
      where: {
        ...(ids === null ? {} : { id: { in: ids } }),
        estado: 'EN_CURSO',
      },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { codigo: 'desc' },
    }),
  ])

  // Sin obra elegida se muestra la primera, que es lo más probable.
  const obraElegida = obra ?? obras[0]?.id ?? null
  const permitida =
    obraElegida && (ids === null || ids.includes(obraElegida))
      ? obraElegida
      : null

  const hoy = new Date()
  const calendario = permitida
    ? await calendarioDePartes(permitida, hoy.getFullYear(), hoy.getMonth() + 1)
    : []

  return (
    <>
      <EncabezadoPantalla titulo="Partes diarios" volverA="/personal" />
      <BandejaPartes
        puedeAprobar={puede(sesion, 'personal.aprobar')}
        puedeCargar={puede(sesion, 'personal.crear')}
        obras={obras}
        obraElegida={permitida}
        calendario={calendario}
        partes={partes.map((p) => {
          const totalHoras = p.lineas.reduce(
            (a, l) =>
              a +
              Number(l.horasNormales) +
              Number(l.horasExtra50) +
              Number(l.horasExtra100),
            0,
          )
          const horasExtra = p.lineas.reduce(
            (a, l) => a + Number(l.horasExtra50) + Number(l.horasExtra100),
            0,
          )
          return {
            id: p.id,
            fecha: p.fecha,
            clima: p.clima,
            enviadoEn: p.enviadoEn,
            obraId: p.obra.id,
            obra: p.obra.codigo,
            obraNombre: p.obra.nombre,
            cargadoPor: p.cargadoPor.nombre,
            personas: p._count.lineas,
            presentes: p.lineas.filter(
              (l) => l.asistencia === 'PRESENTE' || l.asistencia === 'MEDIA_JORNADA',
            ).length,
            ausentes: p.lineas.filter(
              (l) =>
                l.asistencia === 'AUSENTE_CON_AVISO' ||
                l.asistencia === 'AUSENTE_SIN_AVISO',
            ).length,
            totalHoras,
            horasExtra,
          }
        })}
      />
    </>
  )
}
