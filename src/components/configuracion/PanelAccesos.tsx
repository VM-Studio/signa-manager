'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RotateCcw, ShieldCheck } from 'lucide-react'
import type { UsuarioConAccesos } from '@/server/nucleo/accesos-queries'
import {
  accionGuardarAccesos,
  accionVolverAlRol,
} from '@/server/nucleo/accesos'
import {
  MODULOS,
  NOMBRE_MODULO,
  NOMBRE_ROL,
  modulosQueVe,
  rolVeModulo,
  type Modulo,
} from '@/lib/auth/permisos'
import {
  AvisoFijo,
  Boton,
  Buscador,
  EstadoVacio,
  Insignia,
  useAvisos,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { haceCuanto, plural } from '@/lib/formato'

/* =====================================================================
   Accesos.

   Una fila por persona y una casilla por módulo. El rol marca el punto
   de partida; acá se abre o se cierra lo que haga falta para alguien en
   particular.

   Lo que se guarda es solo la diferencia con el rol, y la pantalla lo
   muestra: las casillas que difieren quedan marcadas para que se vea de
   un vistazo a quién se le tocó algo a mano.
   ===================================================================== */

export function PanelAccesos({
  usuarios,
  usuarioActual,
}: {
  usuarios: UsuarioConAccesos[]
  /** Para no dejar que alguien se cierre la puerta a sí mismo. */
  usuarioActual: string
}) {
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return usuarios
    return usuarios.filter((u) =>
      `${u.nombre} ${u.email} ${NOMBRE_ROL[u.rol]}`.toLowerCase().includes(t),
    )
  }, [usuarios, busqueda])

  const conExcepciones = usuarios.filter(
    (u) => Object.keys(u.accesos).length > 0,
  ).length

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <AvisoFijo tono="neutro" titulo="Cómo funciona">
          Cada persona arranca con los módulos que le da su rol. Acá se los
          abrís o se los cerrás de a uno. Lo que puede <em>hacer</em> adentro
          de un módulo lo sigue decidiendo el rol: abrirle Personal a un
          capataz le deja ver las fichas, no cerrar quincenas.
          <br />
          <strong>Las alertas acompañan.</strong> Si le cerrás Vehículos,
          deja de recibir las alertas de vehículos: no le aparecen en la
          bandeja, no le suman en la campana y no se le mandan por mail.
        </AvisoFijo>
      </div>

      {conExcepciones > 0 && (
        <p className="px-4 pt-3 text-menor text-metadato">
          {plural(conExcepciones, 'persona tiene', 'personas tienen')} algún
          acceso cambiado a mano respecto de su rol.
        </p>
      )}

      <div className="px-4 pt-3 pb-1">
        <Buscador
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          alLimpiar={() => setBusqueda('')}
          placeholder="Buscar por nombre, email o rol…"
          className="lg:max-w-[360px]"
        />
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="No hay usuarios que coincidan"
          mensaje="Probá con otra búsqueda."
          icono={<ShieldCheck className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        visibles.map((u) => (
          <FilaAccesos
            key={u.id}
            usuario={u}
            esUnoMismo={u.id === usuarioActual}
          />
        ))
      )}
    </div>
  )
}

function FilaAccesos({
  usuario,
  esUnoMismo,
}: {
  usuario: UsuarioConAccesos
  esUnoMismo: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  // Lo que está guardado hoy, ya con el rol aplicado.
  const guardado = useMemo(
    () => modulosQueVe(usuario.rol, usuario.accesos),
    [usuario.rol, usuario.accesos],
  )

  const [elegidos, setElegidos] = useState<Record<string, boolean>>(guardado)

  const hayCambios = MODULOS.some((m) => elegidos[m] !== guardado[m])
  const tieneExcepciones = Object.keys(usuario.accesos).length > 0

  const alternar = (modulo: Modulo) => {
    setElegidos((previo) => ({ ...previo, [modulo]: !previo[modulo] }))
  }

  const guardar = () => {
    empezar(async () => {
      const r = await accionGuardarAccesos(
        usuario.id,
        MODULOS.filter((m) => elegidos[m]),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Guardado')
        router.refresh()
      }
    })
  }

  const volverAlRol = () => {
    empezar(async () => {
      const r = await accionVolverAlRol(usuario.id)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Listo')
        setElegidos(modulosQueVe(usuario.rol))
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-4 border-y border-niebla bg-blanco lg:mx-4 lg:rounded-[var(--radius-panel)] lg:border">
      {/* ------------------------- quién es ------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-niebla px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-negro">
            {usuario.nombre}
            {esUnoMismo && (
              <span className="ml-2 text-menor font-normal text-metadato">
                (vos)
              </span>
            )}
          </p>
          <p className="truncate text-menor text-metadato">{usuario.email}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Insignia tono="neutro">{NOMBRE_ROL[usuario.rol]}</Insignia>
          {!usuario.activo && <Insignia tono="critico">Desactivado</Insignia>}
          {tieneExcepciones && (
            <Insignia tono="aviso">Accesos a medida</Insignia>
          )}
          {usuario.ultimoAcceso && (
            <span className="text-micro text-metadato">
              entró {haceCuanto(usuario.ultimoAcceso)}
            </span>
          )}
        </div>
      </div>

      {/* ------------------------- los módulos ---------------------- */}
      <div className="grid grid-cols-2 gap-px bg-niebla sm:grid-cols-4">
        {MODULOS.map((modulo) => {
          const marcado = elegidos[modulo]
          const loDaElRol = rolVeModulo(usuario.rol, modulo)
          const difiere = marcado !== loDaElRol

          return (
            <button
              key={modulo}
              type="button"
              disabled={esUnoMismo || pendiente}
              onClick={() => alternar(modulo)}
              aria-pressed={marcado}
              className={cn(
                'flex min-h-[var(--toque-minimo)] items-center gap-2.5 bg-blanco px-3 py-2.5 text-left',
                'transition-colors',
                esUnoMismo
                  ? 'cursor-not-allowed opacity-55'
                  : 'hover:bg-hueso active:bg-hueso',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-[4px] border',
                  marcado
                    ? 'border-negro bg-negro text-blanco'
                    : 'border-acero bg-blanco',
                )}
              >
                {marcado && <Check className="size-3.5" strokeWidth={3} />}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-base',
                    marcado ? 'text-negro' : 'text-metadato',
                  )}
                >
                  {NOMBRE_MODULO[modulo]}
                </span>
                {/* Solo se aclara cuando NO es lo que daría el rol: si
                    no, ocho aclaraciones por fila serían ruido. */}
                {difiere && (
                  <span className="block truncate text-micro text-[var(--color-aviso-texto)]">
                    {marcado ? 'dado a mano' : 'quitado a mano'}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* --------------------------- guardar ------------------------ */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-niebla px-4 py-3">
        {esUnoMismo ? (
          <p className="mr-auto text-menor text-metadato">
            No podés cambiar tus propios accesos. Es a propósito: si te
            quitaras Configuración, nadie podría devolvértela desde la app.
          </p>
        ) : (
          <>
            {tieneExcepciones && (
              <Boton
                variante="fantasma"
                tamano="chico"
                disabled={pendiente}
                onClick={volverAlRol}
                iconoIzquierda={<RotateCcw aria-hidden className="size-4" />}
              >
                Volver a lo que da el rol
              </Boton>
            )}
            <Boton
              tamano="chico"
              disabled={!hayCambios}
              cargando={pendiente}
              onClick={guardar}
            >
              Guardar
            </Boton>
          </>
        )}
      </div>
    </div>
  )
}
