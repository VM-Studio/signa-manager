import { describe, expect, it } from 'vitest'
import { CategoriaLaboral } from '@prisma/client'
import { numeroDeTexto } from '@/lib/formato'
import {
  categoriaDeTexto,
  conflictosDeCuadrilla,
  cuilValido,
  fechaDeTexto,
} from '@/server/personal/reglas'
import {
  kilometrajeValido,
  normalizarPatente,
  patenteValida,
} from '@/server/vehiculos/reglas'

/* =====================================================================
   Pruebas de las altas: empleados, cuadrillas y vehículos.

   Todo lo que se carga una sola vez y después nadie vuelve a mirar. Un
   CUIL con un dígito cambiado o una fecha leída al revés aparecen meses
   después, cuando ya está en la liquidación.
   ===================================================================== */

describe('CUIL y CUIT', () => {
  it('acepta un CUIL bien formado', () => {
    // 20-30123456-3: el 3 es el verificador que le corresponde.
    expect(cuilValido('20301234563')).toBe(true)
  })

  it('rechaza uno con el verificador cambiado', () => {
    expect(cuilValido('20301234564')).toBe(false)
  })

  it('rechaza los que no tienen once números', () => {
    expect(cuilValido('2030123456')).toBe(false)
    expect(cuilValido('203012345633')).toBe(false)
    expect(cuilValido('')).toBe(false)
  })

  it('no le importan los guiones', () => {
    expect(cuilValido('20-30123456-3')).toBe(true)
  })
})

describe('categorías escritas a mano', () => {
  it('entiende cómo las escriben en la obra', () => {
    expect(categoriaDeTexto('Oficial')).toBe(CategoriaLaboral.OFICIAL)
    expect(categoriaDeTexto('medio oficial')).toBe(CategoriaLaboral.MEDIO_OFICIAL)
    expect(categoriaDeTexto('AYUDANTE')).toBe(CategoriaLaboral.AYUDANTE)
  })

  it('peón es ayudante', () => {
    expect(categoriaDeTexto('peón')).toBe(CategoriaLaboral.AYUDANTE)
    expect(categoriaDeTexto('peon')).toBe(CategoriaLaboral.AYUDANTE)
  })

  it('acepta el nombre del enum, por si el archivo sale del propio sistema', () => {
    expect(categoriaDeTexto('OFICIAL_ESPECIALIZADO')).toBe(
      CategoriaLaboral.OFICIAL_ESPECIALIZADO,
    )
  })

  it('devuelve null cuando no la reconoce, en vez de inventar una', () => {
    expect(categoriaDeTexto('encargado de pañol')).toBeNull()
    expect(categoriaDeTexto('')).toBeNull()
  })
})

describe('números escritos a mano', () => {
  it('lee el formato argentino', () => {
    expect(numeroDeTexto('4.500,50')).toBe(4500.5)
  })

  it('lee el formato con punto decimal', () => {
    expect(numeroDeTexto('4500.50')).toBe(4500.5)
  })

  it('ignora el signo pesos y los espacios', () => {
    expect(numeroDeTexto('$ 4.500')).toBe(4500)
  })

  it('devuelve null si no hay número', () => {
    expect(numeroDeTexto('')).toBeNull()
    expect(numeroDeTexto('a convenir')).toBeNull()
    expect(numeroDeTexto(undefined)).toBeNull()
  })
})

describe('fechas escritas a mano', () => {
  it('lee 14/09/2026 como 14 de septiembre', () => {
    const f = fechaDeTexto('14/09/2026')
    expect(f?.getDate()).toBe(14)
    expect(f?.getMonth()).toBe(8)
    expect(f?.getFullYear()).toBe(2026)
  })

  it('lee el formato ISO', () => {
    const f = fechaDeTexto('2026-09-14')
    expect(f?.getDate()).toBe(14)
    expect(f?.getMonth()).toBe(8)
  })

  it('completa el año de dos dígitos', () => {
    expect(fechaDeTexto('14-09-26')?.getFullYear()).toBe(2026)
  })

  it('devuelve null si no se entiende', () => {
    expect(fechaDeTexto('el mes pasado')).toBeNull()
    expect(fechaDeTexto('')).toBeNull()
  })
})

describe('un empleado en una sola cuadrilla activa', () => {
  const gente = [
    { empleadoId: 'a', nombre: 'Juan Pérez', cuadrillaActiva: 'Estructura' },
    { empleadoId: 'b', nombre: 'Luis Gómez', cuadrillaActiva: null },
    { empleadoId: 'c', nombre: 'Ana Ruiz', cuadrillaActiva: 'Terminaciones' },
  ]

  it('avisa quién está dónde', () => {
    const c = conflictosDeCuadrilla(gente, ['a', 'b'])
    expect(c).toEqual([{ empleado: 'Juan Pérez', cuadrilla: 'Estructura' }])
  })

  it('no dice nada de los que no se eligieron', () => {
    expect(conflictosDeCuadrilla(gente, ['b'])).toEqual([])
  })

  it('reporta todos los que estén ocupados, no solo el primero', () => {
    expect(conflictosDeCuadrilla(gente, ['a', 'b', 'c'])).toHaveLength(2)
  })
})

describe('patentes', () => {
  it('acepta el formato viejo y el del Mercosur', () => {
    expect(patenteValida('ABC123')).toBe(true)
    expect(patenteValida('AB123CD')).toBe(true)
  })

  it('no le importan los guiones ni las minúsculas', () => {
    expect(patenteValida('ab-123-cd')).toBe(true)
    expect(normalizarPatente('ab 123 cd')).toBe('AB123CD')
  })

  it('rechaza las que no son', () => {
    expect(patenteValida('ABC12')).toBe(false)
    expect(patenteValida('1234567')).toBe(false)
    expect(patenteValida('ABCDEFG')).toBe(false)
    expect(patenteValida('')).toBe(false)
  })
})

describe('el odómetro no baja', () => {
  it('deja subirlo', () => {
    expect(kilometrajeValido(180_000, 175_000).ok).toBe(true)
  })

  it('deja dejarlo igual', () => {
    expect(kilometrajeValido(175_000, 175_000).ok).toBe(true)
  })

  it('no deja bajarlo y dice cuánto tiene', () => {
    const r = kilometrajeValido(170_000, 175_000)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('175.000')
  })

  it('si no se toca el campo, no se valida nada', () => {
    expect(kilometrajeValido(null, 175_000).ok).toBe(true)
  })
})

describe('el punto de los miles', () => {
  /*
   * Esto ya se comió un valor mal una vez: "4.500" leído como 4,5 deja
   * un valor hora de cuatro pesos con cincuenta. Mil veces menos.
   */
  it('4.500 son cuatro mil quinientos, no cuatro con cinco', () => {
    expect(numeroDeTexto('4.500')).toBe(4500)
  })

  it('1.200.000 es un millón doscientos mil', () => {
    expect(numeroDeTexto('1.200.000')).toBe(1_200_000)
  })

  it('pero 4.5 sí son cuatro y medio', () => {
    expect(numeroDeTexto('4.5')).toBe(4.5)
  })

  it('y 4.50 también', () => {
    expect(numeroDeTexto('4.50')).toBe(4.5)
  })

  it('con coma sola, la coma es el decimal', () => {
    expect(numeroDeTexto('4500,50')).toBe(4500.5)
  })
})
