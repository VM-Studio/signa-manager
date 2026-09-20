import { describe, expect, it } from 'vitest'
import { Condicion, EstadoHerramienta, TipoControlHerramienta } from '@prisma/client'
import { costoLinea } from '@/server/personal/reglas'
import { costoDelViaje } from '@/server/vehiculos/reglas'
import { aplicarMovimiento } from '@/server/herramientas/movimientos'

/* =====================================================================
   Pruebas de los cálculos de costo que alimentan el tablero.

   Son los tres números que el dueño va a mirar y cuestionar: la mano de
   obra, los viajes y las herramientas. Si alguno está mal, todo el
   tablero miente.
   ===================================================================== */

describe('costo de mano de obra', () => {
  it('una jornada normal es horas por valor hora', () => {
    expect(costoLinea(4500, 8, 0, 0)).toBe(36_000)
  })

  it('las horas al 50% valen una vez y media', () => {
    expect(costoLinea(4500, 0, 2, 0)).toBe(13_500)
  })

  it('las horas al 100% valen el doble', () => {
    expect(costoLinea(4500, 0, 0, 2)).toBe(18_000)
    // Y el doble que las normales, a igual cantidad.
    expect(costoLinea(4500, 0, 0, 2)).toBe(costoLinea(4500, 2, 0, 0) * 2)
  })

  it('una jornada con las tres cosas suma bien', () => {
    // 8 x 4500 + 2 x 4500 x 1,5 + 1 x 4500 x 2 = 36000 + 13500 + 9000
    expect(costoLinea(4500, 8, 2, 1)).toBe(58_500)
  })

  it('un ausente no cuesta nada', () => {
    expect(costoLinea(4500, 0, 0, 0)).toBe(0)
  })

  it('media jornada cuesta la mitad', () => {
    expect(costoLinea(4500, 4, 0, 0)).toBe(costoLinea(4500, 8, 0, 0) / 2)
  })

  it('con valor hora cero el costo es cero, no NaN', () => {
    expect(costoLinea(0, 8, 2, 1)).toBe(0)
  })
})

describe('costo de un viaje', () => {
  it('son los kilómetros recorridos por el costo por km', () => {
    expect(costoDelViaje(120_000, 120_140, 860, 0)).toBe(140 * 860)
  })

  it('los peajes se suman aparte', () => {
    expect(costoDelViaje(120_000, 120_140, 860, 8_000)).toBe(140 * 860 + 8_000)
  })

  it('un viaje sin kilómetros solo cuesta los peajes', () => {
    expect(costoDelViaje(null, null, 860, 5_000)).toBe(5_000)
  })

  it('sin costo por km cargado, solo los peajes', () => {
    expect(costoDelViaje(120_000, 120_140, null, 3_000)).toBe(3_000)
  })

  it('nunca da negativo aunque los kilómetros vengan al revés', () => {
    // La validación lo bloquea antes, pero el cálculo no puede devolver
    // un costo negativo que después reste del total de la obra.
    expect(costoDelViaje(120_140, 120_000, 860, 0)).toBe(0)
  })
})

describe('movimientos de herramienta', () => {
  const enDeposito = {
    id: 'h1',
    codigo: 'SIG-H-0042',
    nombre: 'Amoladora',
    estado: EstadoHerramienta.DISPONIBLE,
    tipoControl: TipoControlHerramienta.UNITARIO,
    depositoId: 'dep-1',
    obraId: null,
  }

  it('al entregar, la herramienta sale del depósito y entra a la obra', () => {
    const r = aplicarMovimiento(enDeposito, {
      accion: 'ENTREGAR',
      obraDestinoId: 'obra-1',
    })
    expect(r.herramienta.depositoId).toBeNull()
    expect(r.herramienta.obraId).toBe('obra-1')
    expect(r.herramienta.estado).toBe(EstadoHerramienta.EN_OBRA)
  })

  it('nunca queda en un depósito y en una obra al mismo tiempo', () => {
    const acciones = [
      { accion: 'ENTREGAR' as const, obraDestinoId: 'obra-1' },
      { accion: 'DEVOLVER' as const, depositoDestinoId: 'dep-1', condicion: Condicion.BUENA },
      { accion: 'ENVIAR_A_REPARACION' as const, observaciones: 'roto' },
      { accion: 'MARCAR_EXTRAVIADA' as const, observaciones: 'no aparece' },
      { accion: 'DAR_DE_BAJA' as const, observaciones: 'irreparable' },
    ]

    for (const datos of acciones) {
      const r = aplicarMovimiento(
        { ...enDeposito, estado: EstadoHerramienta.EN_OBRA, depositoId: null, obraId: 'obra-1' },
        datos,
      )
      const enLosDos =
        r.herramienta.depositoId !== null && r.herramienta.obraId !== null
      expect(enLosDos, `${datos.accion} la dejó en los dos lugares`).toBe(false)
    }
  })

  it('una devolución en mala condición sugiere el taller', () => {
    const r = aplicarMovimiento(
      { ...enDeposito, estado: EstadoHerramienta.EN_OBRA, depositoId: null, obraId: 'obra-1' },
      { accion: 'DEVOLVER', depositoDestinoId: 'dep-1', condicion: Condicion.MALA },
    )
    expect(r.sugerirReparacion).toBe(true)
  })
})
