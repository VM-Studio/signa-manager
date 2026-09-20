import Link from 'next/link'
import {
  CalendarRange,
  ClipboardList,
  HardHat,
  LayoutGrid,
  Users,
  Wrench,
} from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { ausentismo } from '@/lib/calculos/personal'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  EncabezadoPantalla,
  GrillaResumen,
  NumeroResumen,
  TituloSeccion,
} from '@/components/ui'
import { numero, porcentajeDirecto } from '@/lib/formato'

export default async function PaginaPersonal() {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Personal" />

  const ahora = new Date()
  const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const ids = await obrasDeLaSesion(sesion)

  const [empleados, sinAsignar, partesSinAprobar, subcontratistas, falta] =
    await Promise.all([
      db.empleado.count({ where: { activo: true } }),
      db.empleado.count({
        where: {
          activo: true,
          asignaciones: {
            none: { OR: [{ hasta: null }, { hasta: { gte: ahora } }] },
          },
        },
      }),
      db.parteDiario.count({
        where: {
          estado: 'ENVIADO',
          ...(ids === null ? {} : { obraId: { in: ids } }),
        },
      }),
      db.subcontratista.count({ where: { activo: true } }),
      ausentismo(inicioDelMes, ahora),
    ])

  const secciones = [
    {
      href: '/personal/partes',
      texto: 'Partes diarios',
      icono: ClipboardList,
      descripcion: 'Cargar el parte del día y aprobar los enviados',
      contador: partesSinAprobar,
    },
    {
      href: '/personal/empleados',
      texto: 'Empleados',
      icono: HardHat,
      descripcion: 'Fichas, documentación, asistencia y valor hora',
    },
    {
      href: '/personal/planificacion',
      texto: 'Planificación',
      icono: LayoutGrid,
      descripcion: 'Quién trabaja en qué obra esta semana',
      contador: sinAsignar,
    },
    {
      href: '/personal/cuadrillas',
      texto: 'Cuadrillas',
      icono: Users,
      descripcion: 'Grupos con su capataz',
    },
    {
      href: '/personal/subcontratistas',
      texto: 'Subcontratistas',
      icono: Wrench,
      descripcion: 'Documentación, obras y pagos',
    },
    ...(puede(sesion, 'personal.aprobar')
      ? [
          {
            href: '/personal/quincenas',
            texto: 'Quincenas',
            icono: CalendarRange,
            descripcion: 'Horas, costos y el resumen para el estudio',
          },
        ]
      : []),
  ]

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Personal" sinVolver />

      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Empleados"
          valor={numero(empleados)}
          href="/personal/empleados"
        />
        <NumeroResumen
          etiqueta="Sin asignar"
          valor={numero(sinAsignar)}
          tono={sinAsignar > 0 ? 'aviso' : 'neutro'}
          href="/personal/planificacion"
        />
        <NumeroResumen
          etiqueta="Ausentismo"
          valor={porcentajeDirecto(falta.porcentaje)}
          tono={falta.porcentaje > 8 ? 'aviso' : 'neutro'}
          detalle="del mes"
        />
      </GrillaResumen>

      <TituloSeccion>El módulo</TituloSeccion>
      <div className="divide-y divide-niebla border-y border-niebla bg-blanco">
        {secciones.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex min-h-[var(--toque-minimo)] items-center gap-3 px-4 py-3 active:bg-hueso"
          >
            <s.icono
              aria-hidden
              className="size-5 shrink-0 text-grafito"
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base text-negro">
                {s.texto}
              </span>
              <span className="block truncate text-menor text-metadato">
                {s.descripcion}
              </span>
            </span>
            {s.contador !== undefined && s.contador > 0 && (
              <span className="cifras shrink-0 rounded-full bg-[var(--color-aviso-texto)] px-2 py-0.5 text-micro font-medium text-blanco">
                {s.contador}
              </span>
            )}
          </Link>
        ))}
      </div>

      <p className="px-4 pt-4 text-menor text-metadato">
        {numero(subcontratistas)} subcontratistas activos. Este módulo no
        liquida sueldos: registra quién trabajó dónde y cuánto, y le entrega
        el resumen al estudio contable.
      </p>
    </div>
  )
}
