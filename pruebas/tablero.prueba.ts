import { describe, expect, it } from 'vitest'
import { Moneda } from '@prisma/client'
import { aPesos, armarPeriodo } from '@/lib/calculos/tablero'

/* =====================================================================
   Pruebas de la capa de cálculo del tablero.

   Los casos principales: la conversión de dólares, que es lo que más
   fácil se rompe y lo que peor se nota, y el armado de los períodos.
   ===================================================================== */

describe('conversión a pesos', () => {
  it('deja los pesos como están', () => {
    expect(aPesos(1_250_000, Moneda.ARS, null)).toBe(1_250_000)
  })

  it('ignora el tipo de cambio si el monto ya está en pesos', () => {
    // Un movimiento en pesos con tipo de cambio cargado por error no
    // tiene que multiplicarse.
    expect(aPesos(1_000_000, Moneda.ARS, 1640)).toBe(1_000_000)
  })

  it('convierte los dólares con el tipo de cambio del movimiento', () => {
    expect(aPesos(10_000, Moneda.USD, 1640)).toBe(16_400_000)
  })

  it('usa el tipo de cambio del movimiento y no uno de hoy', () => {
    // Dos movimientos del mismo monto en momentos distintos valen
    // distinto en pesos. El histórico no se reescribe.
    const enMarzo = aPesos(1000, Moneda.USD, 1100)
    const enSeptiembre = aPesos(1000, Moneda.USD, 1640)
    expect(enMarzo).toBe(1_100_000)
    expect(enSeptiembre).toBe(1_640_000)
    expect(enSeptiembre).toBeGreaterThan(enMarzo)
  })

  it('devuelve cero si un movimiento en dólares no tiene tipo de cambio', () => {
    // Antes que inventar un número que después nadie puede explicar.
    expect(aPesos(10_000, Moneda.USD, null)).toBe(0)
    expect(aPesos(10_000, Moneda.USD, 0)).toBe(0)
  })

  it('trata null y undefined como cero', () => {
    expect(aPesos(null, Moneda.ARS, null)).toBe(0)
    expect(aPesos(undefined, Moneda.ARS, null)).toBe(0)
  })

  it('acepta los Decimal de Prisma, que llegan como objeto', () => {
    // Number(decimal) directo funciona porque tienen toString().
    const decimalDePrisma = { toString: () => '1250000.50' }
    expect(aPesos(decimalDePrisma, Moneda.ARS, null)).toBe(1_250_000.5)
  })
})

describe('armado de períodos', () => {
  it('este mes va del día 1 hasta hoy', () => {
    const p = armarPeriodo('este-mes')
    const hoy = new Date()
    expect(p.desde.getDate()).toBe(1)
    expect(p.desde.getMonth()).toBe(hoy.getMonth())
    expect(p.hasta.getDate()).toBe(hoy.getDate())
  })

  it('el mes anterior es el mes completo', () => {
    const p = armarPeriodo('mes-anterior')
    const hoy = new Date()
    expect(p.desde.getDate()).toBe(1)
    // El último día del mes anterior.
    expect(p.hasta.getMonth()).not.toBe(hoy.getMonth())
    const siguienteAlFin = new Date(p.hasta)
    siguienteAlFin.setDate(siguienteAlFin.getDate() + 1)
    expect(siguienteAlFin.getMonth()).toBe(hoy.getMonth())
  })

  it('los últimos 3 meses arrancan dos meses atrás', () => {
    const p = armarPeriodo('ultimos-3-meses')
    const hoy = new Date()
    const esperado = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
    expect(p.desde.getMonth()).toBe(esperado.getMonth())
    expect(p.desde.getDate()).toBe(1)
  })

  it('este año arranca el 1 de enero', () => {
    const p = armarPeriodo('este-ano')
    expect(p.desde.getMonth()).toBe(0)
    expect(p.desde.getDate()).toBe(1)
    expect(p.desde.getFullYear()).toBe(new Date().getFullYear())
  })

  it('el personalizado toma las fechas que se le pasan', () => {
    const p = armarPeriodo('personalizado', '2026-03-01', '2026-03-31')
    expect(p.desde.getFullYear()).toBe(2026)
    expect(p.desde.getMonth()).toBe(2)
    expect(p.desde.getDate()).toBe(1)
    expect(p.hasta.getDate()).toBe(31)
  })

  it('con fechas inválidas cae a este mes en vez de romper', () => {
    const p = armarPeriodo('personalizado', 'cualquier cosa', '')
    expect(p.desde.getDate()).toBe(1)
    expect(p.desde.getMonth()).toBe(new Date().getMonth())
  })
})
