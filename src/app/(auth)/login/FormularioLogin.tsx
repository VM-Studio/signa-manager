'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { accionIngresar, type EstadoLogin } from './acciones'
import type { UsuarioDemo } from './usuarios-demo'
import { cn } from '@/lib/cn'

export function FormularioLogin({
  volverA,
  usuariosDemo,
  claveDemo,
}: {
  volverA?: string
  usuariosDemo: UsuarioDemo[]
  claveDemo: string
}) {
  const [estado, accion] = useActionState<EstadoLogin, FormData>(
    accionIngresar,
    {},
  )
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [demoAbierto, setDemoAbierto] = useState(false)

  const completarCon = (usuario: UsuarioDemo) => {
    setEmail(usuario.email)
    setContrasena(claveDemo)
    setDemoAbierto(false)
  }

  return (
    <div className="w-full max-w-[340px] lg:max-w-none">
      <form action={accion} className="flex flex-col gap-4">
        {volverA && <input type="hidden" name="volverA" value={volverA} />}

        {estado.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[#2a1614] px-3 py-2.5 text-chico text-[#ff9a91] lg:bg-[var(--color-critico-suave)] lg:text-critico"
          >
            <AlertCircle aria-hidden className="mt-px size-4 shrink-0" />
            {estado.error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-menor font-medium text-acero lg:text-grafito">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@signa.demo"
            aria-invalid={estado.errorEmail ? true : undefined}
            aria-describedby={estado.errorEmail ? 'email-error' : undefined}
            className={cn(
              'min-h-[52px] w-full rounded-[var(--radius-control)] border bg-carbon px-3.5 lg:bg-blanco',
              'text-cuerpo text-blanco placeholder:text-[#5a5a5a] lg:text-negro lg:placeholder:text-acero',
              'transition-colors outline-none',
              estado.errorEmail
                ? 'border-[#8c3129] focus:border-[#b42318] lg:border-critico'
                : 'border-[#333] focus:border-acero lg:border-niebla lg:focus:border-negro',
            )}
          />
          {estado.errorEmail && (
            <p id="email-error" role="alert" className="text-menor text-[#ff9a91] lg:text-critico">
              {estado.errorEmail}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contrasena" className="text-menor font-medium text-acero lg:text-grafito">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="contrasena"
              name="contrasena"
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              aria-invalid={estado.errorContrasena ? true : undefined}
              aria-describedby={estado.errorContrasena ? 'clave-error' : undefined}
              className={cn(
                'min-h-[52px] w-full rounded-[var(--radius-control)] border bg-carbon pr-12 pl-3.5 lg:bg-blanco',
                'text-cuerpo text-blanco placeholder:text-[#5a5a5a] lg:text-negro lg:placeholder:text-acero',
                'transition-colors outline-none',
                estado.errorContrasena
                  ? 'border-[#8c3129] focus:border-[#b42318] lg:border-critico'
                  : 'border-[#333] focus:border-acero lg:border-niebla lg:focus:border-negro',
              )}
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="sobre-negro absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-acero lg:text-grafito"
            >
              {verClave ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )}
            </button>
          </div>
          {estado.errorContrasena && (
            <p id="clave-error" role="alert" className="text-menor text-[#ff9a91] lg:text-critico">
              {estado.errorContrasena}
            </p>
          )}
        </div>

        <BotonIngresar />
      </form>

      {usuariosDemo.length > 0 && (
        <div className="mt-8 border-t border-[#262626] pt-4 lg:border-niebla">
          <button
            type="button"
            onClick={() => setDemoAbierto((a) => !a)}
            aria-expanded={demoAbierto}
            className="sobre-negro flex min-h-[44px] w-full items-center justify-between gap-2 text-menor text-acero lg:text-grafito"
          >
            Usuarios de demostración
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 transition-transform duration-200',
                demoAbierto && 'rotate-180',
              )}
            />
          </button>

          {demoAbierto && (
            <ul className="mt-2 flex flex-col divide-y divide-[#1f1f1f] border-y border-[#1f1f1f] lg:divide-niebla lg:border-niebla">
              {usuariosDemo.map((u) => (
                <li key={u.email}>
                  <button
                    type="button"
                    onClick={() => completarCon(u)}
                    className="sobre-negro flex min-h-[48px] w-full items-center justify-between gap-3 py-2 text-left active:bg-carbon lg:px-2 lg:hover:bg-niebla lg:active:bg-niebla"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-chico text-blanco lg:text-negro">
                        {u.nombre}
                      </span>
                      <span className="block truncate text-micro text-[#666] lg:text-metadato">
                        {u.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-micro text-acero lg:text-metadato">{u.rol}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function BotonIngresar() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        'sobre-negro mt-2 min-h-[52px] w-full rounded-[var(--radius-control)]',
        'bg-blanco text-titulo font-medium text-negro',
        'transition-colors active:bg-niebla',
        'disabled:cursor-not-allowed disabled:bg-acero disabled:text-carbon',
        // En escritorio el formulario va sobre claro: se invierte.
        'lg:bg-negro lg:text-blanco lg:hover:bg-carbon lg:active:bg-carbon',
        'lg:disabled:bg-acero lg:disabled:text-blanco',
      )}
    >
      {pending ? 'Entrando…' : 'Ingresar'}
    </button>
  )
}
