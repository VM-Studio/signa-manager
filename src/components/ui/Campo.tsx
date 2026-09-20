'use client'

import { forwardRef, useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Campos de formulario.
   Todos con etiqueta visible (nunca solo placeholder), alto mínimo de
   48px, y el error debajo del campo, no arriba del formulario.
   ===================================================================== */

interface EnvoltorioProps {
  id: string
  etiqueta: string
  error?: string
  ayuda?: string
  obligatorio?: boolean
  children: ReactNode
  className?: string
}

function Envoltorio({
  id,
  etiqueta,
  error,
  ayuda,
  obligatorio,
  children,
  className,
}: EnvoltorioProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-menor font-medium text-grafito">
        {etiqueta}
        {obligatorio && <span className="text-critico"> *</span>}
      </label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-menor text-critico"
        >
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="text-menor text-acero">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}

/** Clases compartidas por todos los controles, para que se vean iguales. */
const baseControl = [
  'w-full min-h-[48px] rounded-[var(--radius-control)] bg-blanco px-3',
  'text-cuerpo text-negro placeholder:text-acero',
  'border transition-colors',
  'disabled:bg-hueso disabled:text-acero disabled:cursor-not-allowed',
].join(' ')

const borde = (hayError?: boolean) =>
  hayError
    ? 'border-critico focus:border-critico'
    : 'border-niebla focus:border-negro'

function describedBy(id: string, error?: string, ayuda?: string) {
  if (error) return `${id}-error`
  if (ayuda) return `${id}-ayuda`
  return undefined
}

// ------------------------------- TEXTO --------------------------------

export interface CampoTextoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
  contenedorClassName?: string
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(
  function CampoTexto(
    { etiqueta, error, ayuda, required, className, contenedorClassName, ...props },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `campo-${props.name}` : generado

    return (
      <Envoltorio
        id={id}
        etiqueta={etiqueta}
        error={error}
        ayuda={ayuda}
        obligatorio={required}
        className={contenedorClassName}
      >
        <input
          ref={ref}
          id={id}
          type="text"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, ayuda)}
          className={cn(baseControl, borde(!!error), className)}
          {...props}
        />
      </Envoltorio>
    )
  },
)

// ------------------------------ NUMÉRICO ------------------------------

export interface CampoNumeroProps extends Omit<CampoTextoProps, 'type'> {
  /** Prefijo fijo dentro del campo: "$", "kg", "h". */
  prefijo?: string
  sufijo?: string
}

export const CampoNumero = forwardRef<HTMLInputElement, CampoNumeroProps>(
  function CampoNumero(
    {
      etiqueta,
      error,
      ayuda,
      required,
      prefijo,
      sufijo,
      className,
      contenedorClassName,
      ...props
    },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `campo-${props.name}` : generado

    return (
      <Envoltorio
        id={id}
        etiqueta={etiqueta}
        error={error}
        ayuda={ayuda}
        obligatorio={required}
        className={contenedorClassName}
      >
        <div className="relative">
          {prefijo && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-cuerpo text-acero"
            >
              {prefijo}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type="number"
            // El teclado numérico con coma es el que espera alguien cargando horas.
            inputMode="decimal"
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, error, ayuda)}
            className={cn(
              baseControl,
              borde(!!error),
              'cifras',
              prefijo && 'pl-8',
              sufijo && 'pr-12',
              className,
            )}
            {...props}
          />
          {sufijo && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-menor text-acero"
            >
              {sufijo}
            </span>
          )}
        </div>
      </Envoltorio>
    )
  },
)

// ------------------------------- FECHA --------------------------------

export const CampoFecha = forwardRef<HTMLInputElement, CampoTextoProps>(
  function CampoFecha(
    { etiqueta, error, ayuda, required, className, contenedorClassName, ...props },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `campo-${props.name}` : generado

    return (
      <Envoltorio
        id={id}
        etiqueta={etiqueta}
        error={error}
        ayuda={ayuda}
        obligatorio={required}
        className={contenedorClassName}
      >
        <input
          ref={ref}
          id={id}
          type="date"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, ayuda)}
          className={cn(baseControl, borde(!!error), 'cifras', className)}
          {...props}
        />
      </Envoltorio>
    )
  },
)

export const CampoFechaHora = forwardRef<HTMLInputElement, CampoTextoProps>(
  function CampoFechaHora(
    { etiqueta, error, ayuda, required, className, contenedorClassName, ...props },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `campo-${props.name}` : generado

    return (
      <Envoltorio
        id={id}
        etiqueta={etiqueta}
        error={error}
        ayuda={ayuda}
        obligatorio={required}
        className={contenedorClassName}
      >
        <input
          ref={ref}
          id={id}
          type="datetime-local"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, ayuda)}
          className={cn(baseControl, borde(!!error), 'cifras', className)}
          {...props}
        />
      </Envoltorio>
    )
  },
)

// ------------------------------- SELECT -------------------------------

export interface OpcionSelect {
  valor: string
  texto: string
}

export interface CampoSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
  opciones: OpcionSelect[]
  /** Primera opción vacía: "Elegí una obra…". */
  vacio?: string
  contenedorClassName?: string
}

export const CampoSelect = forwardRef<HTMLSelectElement, CampoSelectProps>(
  function CampoSelect(
    {
      etiqueta,
      error,
      ayuda,
      opciones,
      vacio,
      required,
      className,
      contenedorClassName,
      ...props
    },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `campo-${props.name}` : generado

    return (
      <Envoltorio
        id={id}
        etiqueta={etiqueta}
        error={error}
        ayuda={ayuda}
        obligatorio={required}
        className={contenedorClassName}
      >
        {/* Select nativo a propósito: en el celular abre la rueda del sistema,
            que es más rápida y accesible que cualquier lista propia. */}
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, ayuda)}
          className={cn(baseControl, borde(!!error), 'campo-select', className)}
          {...props}
        >
          {vacio !== undefined && <option value="">{vacio}</option>}
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      </Envoltorio>
    )
  },
)

// ------------------------------ TEXTAREA ------------------------------

export interface CampoTextoLargoProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
  contenedorClassName?: string
}

export const CampoTextoLargo = forwardRef<
  HTMLTextAreaElement,
  CampoTextoLargoProps
>(function CampoTextoLargo(
  {
    etiqueta,
    error,
    ayuda,
    required,
    rows = 3,
    className,
    contenedorClassName,
    ...props
  },
  ref,
) {
  const generado = useId()
  const id = props.name ? `campo-${props.name}` : generado

  return (
    <Envoltorio
      id={id}
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      obligatorio={required}
      className={contenedorClassName}
    >
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, ayuda)}
        className={cn(baseControl, borde(!!error), 'resize-y py-2.5', className)}
        {...props}
      />
    </Envoltorio>
  )
})

// ------------------------------ CHECKBOX ------------------------------

export interface CampoCheckProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  etiqueta: string
  descripcion?: string
  error?: string
}

export const CampoCheck = forwardRef<HTMLInputElement, CampoCheckProps>(
  function CampoCheck(
    { etiqueta, descripcion, error, className, ...props },
    ref,
  ) {
    const generado = useId()
    const id = props.name ? `check-${props.name}` : generado

    return (
      <div className="flex flex-col gap-1.5">
        {/* Toda la fila es el área táctil, no solo el cuadradito. */}
        <label
          htmlFor={id}
          className="flex min-h-[48px] cursor-pointer items-center gap-3 py-1"
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'size-5 shrink-0 rounded-[3px] border-2 border-grafito accent-negro',
              'disabled:opacity-40',
              error && 'border-critico',
              className,
            )}
            {...props}
          />
          <span className="flex flex-col">
            <span className="text-base text-negro">{etiqueta}</span>
            {descripcion && (
              <span className="text-menor text-acero">{descripcion}</span>
            )}
          </span>
        </label>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-menor text-critico">
            {error}
          </p>
        )}
      </div>
    )
  },
)

// ----------------------------- INTERRUPTOR ----------------------------

export interface InterruptorProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  etiqueta: string
  descripcion?: string
}

export const Interruptor = forwardRef<HTMLInputElement, InterruptorProps>(
  function Interruptor({ etiqueta, descripcion, className, ...props }, ref) {
    const generado = useId()
    const id = props.name ? `sw-${props.name}` : generado

    return (
      <label
        htmlFor={id}
        className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 py-1"
      >
        <span className="flex flex-col">
          <span className="text-base text-negro">{etiqueta}</span>
          {descripcion && (
            <span className="text-menor text-acero">{descripcion}</span>
          )}
        </span>

        <span className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={cn('peer sr-only', className)}
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              'block h-[28px] w-[48px] rounded-full bg-niebla transition-colors',
              'peer-checked:bg-negro peer-disabled:opacity-40',
              'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-negro',
            )}
          />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-[3px] left-[3px] size-[22px] rounded-full bg-blanco',
              'transition-transform duration-150 peer-checked:translate-x-[20px]',
            )}
          />
        </span>
      </label>
    )
  },
)
