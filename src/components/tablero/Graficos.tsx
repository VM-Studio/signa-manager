'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { monedaCorta } from '@/lib/formato'

/* =====================================================================
   Los gráficos del tablero.

   Criterio de CLAUDE.md: es el único lugar de la app con gráficos.
   Escala de grises con un solo tono de énfasis, y los colores de estado
   únicamente para marcar resultado positivo o negativo.
   ===================================================================== */

const NEGRO = '#000000'
const GRAFITO = '#4A4A4A'
const ACERO = '#8C8C8C'
const NIEBLA = '#E6E6E6'
const CORRECTO = '#1F7A4D'
const CRITICO = '#B42318'

/** Tooltip propio: el de recharts no respeta la tipografía ni el formato. */
function Etiqueta({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-[var(--radius-control)] border border-niebla bg-blanco px-2.5 py-2 text-menor shadow-sm">
      {label && <p className="mb-1 font-medium text-negro">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-grafito">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-[1px]"
            style={{ background: p.color }}
          />
          {p.name}: <span className="cifras text-negro">{monedaCorta(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

/* ------------------- BARRAS POR UNIDAD DE NEGOCIO ------------------- */

export interface BarraUnidad {
  nombre: string
  ingresos: number
  costoTotal: number
  resultado: number
}

export function BarrasPorUnidad({
  datos,
  alTocar,
  activa,
}: {
  datos: BarraUnidad[]
  alTocar?: (nombre: string) => void
  activa?: string | null
}) {
  if (datos.length === 0) return null

  // El alto crece con la cantidad de unidades: así las barras no se
  // aplastan en el celular.
  const alto = Math.max(160, datos.length * 46)

  return (
    <div style={{ width: '100%', height: alto }}>
      <ResponsiveContainer>
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid horizontal={false} stroke={NIEBLA} />
          <XAxis
            type="number"
            tickFormatter={(v) => monedaCorta(v)}
            tick={{ fontSize: 10, fill: ACERO }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={96}
            tick={{ fontSize: 11, fill: GRAFITO }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Etiqueta />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill={NEGRO}
            radius={[0, 2, 2, 0]}
            onClick={(d) => {
              const fila = (d as { payload?: BarraUnidad }).payload
              if (fila) alTocar?.(fila.nombre)
            }}
            cursor={alTocar ? 'pointer' : undefined}
          >
            {datos.map((d) => (
              <Cell
                key={d.nombre}
                fill={activa && activa !== d.nombre ? ACERO : NEGRO}
              />
            ))}
          </Bar>
          <Bar
            dataKey="costoTotal"
            name="Costo"
            fill={NIEBLA}
            radius={[0, 2, 2, 0]}
            onClick={(d) => {
              const fila = (d as { payload?: BarraUnidad }).payload
              if (fila) alTocar?.(fila.nombre)
            }}
            cursor={alTocar ? 'pointer' : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ----------------------- EVOLUCIÓN MENSUAL -------------------------- */

export interface PuntoMes {
  etiqueta: string
  ingresos: number
  costos: number
  resultado: number
}

export function LineaEvolucion({ datos }: { datos: PuntoMes[] }) {
  if (datos.length === 0) return null

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={NIEBLA} vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tick={{ fontSize: 10, fill: ACERO }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => monedaCorta(v)}
            tick={{ fontSize: 10, fill: ACERO }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<Etiqueta />} />
          <Line
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke={NEGRO}
            strokeWidth={2}
            dot={{ r: 3, fill: NEGRO }}
          />
          <Line
            type="monotone"
            dataKey="costos"
            name="Costos"
            stroke={ACERO}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: ACERO }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------- COMPOSICIÓN DEL COSTO -------------------------- */

export interface ParteDelCosto {
  nombre: string
  monto: number
}

/**
 * Barra apilada de una sola línea: de qué está hecho el costo.
 * No es un gráfico de torta a propósito: en una barra se comparan las
 * proporciones de un vistazo y entra en el ancho de una fila.
 */
export function BarraComposicion({
  partes,
  total,
}: {
  partes: ParteDelCosto[]
  total: number
}) {
  if (total <= 0) return null

  // Escala de grises: cada rubro un poco más claro que el anterior.
  const TONOS = ['#000000', '#3A3A3A', '#6B6B6B', '#9C9C9C', '#C4C4C4', '#E6E6E6']

  const conValor = partes.filter((p) => p.monto > 0)

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-niebla">
        {conValor.map((p, i) => (
          <div
            key={p.nombre}
            title={`${p.nombre}: ${monedaCorta(p.monto)}`}
            style={{
              width: `${(p.monto / total) * 100}%`,
              background: TONOS[i % TONOS.length],
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {conValor.map((p, i) => (
          <span
            key={p.nombre}
            className="flex items-center gap-1 text-micro text-grafito"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[1px]"
              style={{ background: TONOS[i % TONOS.length] }}
            />
            {p.nombre}
            <span className="cifras text-acero">
              {Math.round((p.monto / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export { CORRECTO, CRITICO }
