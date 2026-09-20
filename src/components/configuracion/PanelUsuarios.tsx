'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { KeyRound, Plus, Users } from 'lucide-react'
import { Rol } from '@prisma/client'
import {
  accionActivarUsuario,
  accionCrearUsuario,
  accionEditarUsuario,
  accionRestablecerContrasena,
  type EstadoAccion,
} from '@/server/nucleo/configuracion'
import {
  Boton,
  BotonFlotante,
  CampoSelect,
  CampoTexto,
  EstadoVacio,
  FilaLista,
  HojaConfirmacion,
  HojaInferior,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { NOMBRE_ROL } from '@/lib/auth/permisos'
import { haceCuanto } from '@/lib/formato'

export interface UsuarioVista {
  id: string
  nombre: string
  email: string
  rol: Rol
  telefono: string | null
  activo: boolean
  ultimoAcceso: Date | null
  empleadoId: string | null
  empleado: string | null
}

const OPCIONES_ROL = Object.values(Rol).map((r) => ({
  valor: r,
  texto: NOMBRE_ROL[r],
}))

export function PanelUsuarios({
  usuarios,
  empleados,
  puedeEditar,
  miUsuarioId,
}: {
  usuarios: UsuarioVista[]
  empleados: Array<{ id: string; nombre: string; legajo: string }>
  puedeEditar: boolean
  miUsuarioId: string
}) {
  const avisos = useAvisos()
  const [editando, setEditando] = useState<UsuarioVista | null | undefined>(undefined)
  const [aDesactivar, setADesactivar] = useState<UsuarioVista | null>(null)
  const [restableciendo, setRestableciendo] = useState<UsuarioVista | null>(null)
  const [pendiente, empezar] = useTransition()

  const cambiarActivo = (usuario: UsuarioVista, activo: boolean) => {
    empezar(async () => {
      const r = await accionActivarUsuario(usuario.id, activo)
      if (r.error) avisos.error(r.error)
      else avisos.correcto(r.mensaje ?? 'Listo')
      setADesactivar(null)
      setEditando(undefined)
    })
  }

  const activos = usuarios.filter((u) => u.activo)
  const inactivos = usuarios.filter((u) => !u.activo)

  const fila = (u: UsuarioVista) => (
    <FilaLista
      key={u.id}
      titulo={u.nombre}
      subtitulo={u.email}
      detalle={
        [
          u.empleado ? `Legajo ${u.empleado}` : null,
          u.ultimoAcceso ? `Entró ${haceCuanto(u.ultimoAcceso)}` : 'Nunca entró',
        ]
          .filter(Boolean)
          .join(' · ')
      }
      izquierda={
        <span className="flex size-9 items-center justify-center rounded-full bg-niebla text-menor font-medium text-grafito">
          {u.nombre.charAt(0)}
        </span>
      }
      debajoDerecha={
        <div className="flex flex-col items-end gap-1">
          <Insignia tono={u.activo ? 'neutro' : 'critico'}>
            {u.activo ? NOMBRE_ROL[u.rol] : 'Desactivado'}
          </Insignia>
          {u.id === miUsuarioId && (
            <span className="text-micro text-metadato">Sos vos</span>
          )}
        </div>
      }
      alTocar={puedeEditar ? () => setEditando(u) : undefined}
      flecha={puedeEditar}
    />
  )

  return (
    <div className="pb-24">
      {usuarios.length === 0 ? (
        <EstadoVacio
          titulo="No hay usuarios cargados"
          mensaje="Creá el primero para que alguien pueda entrar a la app."
          icono={<Users className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <>
          <TituloSeccion>Quién entra a la app</TituloSeccion>
          <Lista>{activos.map(fila)}</Lista>
          {inactivos.length > 0 && (
            <>
              <TituloSeccion>Desactivados</TituloSeccion>
              <Lista>{inactivos.map(fila)}</Lista>
            </>
          )}
        </>
      )}

      {editando !== undefined && (
        <HojaUsuario
          usuario={editando}
          empleados={empleados}
          alCerrar={() => setEditando(undefined)}
          alDesactivar={(u) => setADesactivar(u)}
          alActivar={(u) => cambiarActivo(u, true)}
          alRestablecer={(u) => {
            setEditando(undefined)
            setRestableciendo(u)
          }}
        />
      )}

      {restableciendo && (
        <HojaContrasena
          usuario={restableciendo}
          alCerrar={() => setRestableciendo(null)}
        />
      )}

      <HojaConfirmacion
        abierta={aDesactivar !== null}
        alCerrar={() => setADesactivar(null)}
        alConfirmar={() => aDesactivar && cambiarActivo(aDesactivar, false)}
        titulo={`¿Desactivar a ${aDesactivar?.nombre ?? ''}?`}
        mensaje="No va a poder entrar más a la app. Todo lo que cargó se conserva."
        textoConfirmar="Desactivar"
        peligrosa
        cargando={pendiente}
      />

      {puedeEditar && (
        <BotonFlotante
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nuevo usuario"
          alTocar={() => setEditando(null)}
        >
          Nuevo
        </BotonFlotante>
      )}
    </div>
  )
}

function HojaUsuario({
  usuario,
  empleados,
  alCerrar,
  alDesactivar,
  alActivar,
  alRestablecer,
}: {
  usuario: UsuarioVista | null
  empleados: Array<{ id: string; nombre: string; legajo: string }>
  alCerrar: () => void
  alDesactivar: (u: UsuarioVista) => void
  alActivar: (u: UsuarioVista) => void
  alRestablecer: (u: UsuarioVista) => void
}) {
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<EstadoAccion, FormData>(
    async (previo, datos) => {
      const r = usuario
        ? await accionEditarUsuario(usuario.id, previo, datos)
        : await accionCrearUsuario(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      descripcion={usuario?.email}
      alto="alto"
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && (
          <p role="alert" className="text-menor text-critico">
            {estado.error}
          </p>
        )}

        <CampoTexto
          name="nombre"
          etiqueta="Nombre y apellido"
          defaultValue={usuario?.nombre}
          required
          error={e.nombre}
        />
        <CampoTexto
          name="email"
          etiqueta="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          defaultValue={usuario?.email}
          required
          error={e.email}
        />
        <CampoSelect
          name="rol"
          etiqueta="Rol"
          defaultValue={usuario?.rol ?? Rol.CAPATAZ}
          required
          error={e.rol}
          opciones={OPCIONES_ROL}
          ayuda="Define qué pantallas ve y qué puede hacer."
        />
        <CampoTexto
          name="telefono"
          etiqueta="Teléfono"
          type="tel"
          inputMode="tel"
          defaultValue={usuario?.telefono ?? ''}
          error={e.telefono}
        />
        <CampoSelect
          name="empleadoId"
          etiqueta="Vincular con un empleado"
          defaultValue={usuario?.empleadoId ?? ''}
          vacio="Sin vincular"
          error={e.empleadoId}
          opciones={empleados.map((emp) => ({
            valor: emp.id,
            texto: `${emp.nombre} · legajo ${emp.legajo}`,
          }))}
          ayuda="Hace falta para capataces y choferes: así ven su obra y sus viajes."
        />

        {!usuario && (
          <CampoTexto
            name="contrasena"
            etiqueta="Contraseña inicial"
            type="password"
            required
            error={e.contrasena}
            ayuda="Mínimo 8 caracteres. Decísela en persona y pedile que la cambie."
          />
        )}

        <Guardar />

        {usuario && (
          <div className="space-y-2 border-t border-niebla pt-4">
            <Boton
              variante="secundario"
              ancho
              iconoIzquierda={<KeyRound aria-hidden className="size-4" />}
              onClick={() => alRestablecer(usuario)}
            >
              Restablecer contraseña
            </Boton>
            {usuario.activo ? (
              <Boton variante="peligro" ancho onClick={() => alDesactivar(usuario)}>
                Desactivar usuario
              </Boton>
            ) : (
              <Boton variante="secundario" ancho onClick={() => alActivar(usuario)}>
                Activar de nuevo
              </Boton>
            )}
          </div>
        )}
      </form>
    </HojaInferior>
  )
}

function HojaContrasena({
  usuario,
  alCerrar,
}: {
  usuario: UsuarioVista
  alCerrar: () => void
}) {
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<EstadoAccion, FormData>(
    async (previo, datos) => {
      const r = await accionRestablecerContrasena(usuario.id, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
      }
      return r
    },
    {},
  )

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Restablecer contraseña"
      descripcion={usuario.nombre}
    >
      <form action={ejecutar} className="space-y-4">
        <CampoTexto
          name="contrasena"
          etiqueta="Contraseña nueva"
          type="password"
          required
          error={estado.errores?.contrasena}
          ayuda="Mínimo 8 caracteres. Decísela en persona, no por mensaje."
        />
        <Guardar />
      </form>
    </HojaInferior>
  )
}

function Guardar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      Guardar
    </Boton>
  )
}
