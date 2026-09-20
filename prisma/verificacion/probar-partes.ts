/**
 * Las reglas del parte diario y de las quincenas, contra las mismas
 * funciones que usan las Server Actions.
 */
import './sin-server-only'
import { Asistencia, EstadoParte } from '@prisma/client'
import {
  costoLinea,
  diasHabilesEntre,
  esDiaHabil,
  hayErrores,
  quincenaDe,
  sePuedeAprobar,
  sePuedeEditar,
  validarParte,
  type LineaParte,
} from '../../src/server/personal/reglas'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

const persona = (cambios: Partial<LineaParte> = {}): LineaParte => ({
  empleadoId: 'e1',
  nombre: 'Quiroga, Martín',
  asistencia: Asistencia.PRESENTE,
  horasNormales: 8,
  horasExtra50: 0,
  horasExtra100: 0,
  ...cambios,
})

console.log('\n  ── Costo de una línea ──\n')
// Regla de CLAUDE.md: normales × vh + extra50 × vh × 1,5 + extra100 × vh × 2
ok(costoLinea(4500, 8, 0, 0) === 36_000, '8 h normales a $4.500 → $36.000')
ok(costoLinea(4500, 8, 2, 0) === 49_500, '+ 2 h al 50% → $49.500')
ok(costoLinea(4500, 8, 0, 2) === 54_000, '+ 2 h al 100% → $54.000')
ok(costoLinea(4500, 8, 2, 2) === 67_500, '+ 2 al 50% y 2 al 100% → $67.500')
ok(costoLinea(4500, 4, 0, 0) === 18_000, 'Media jornada → la mitad')
ok(costoLinea(4500, 0, 0, 0) === 0, 'Ausente → cero')

console.log('\n  ── Validación del parte ──\n')
ok(hayErrores(validarParte([])), 'Un parte vacío se rechaza')

ok(!hayErrores(validarParte([persona()])), 'Un presente con 8 horas pasa')

ok(
  hayErrores(validarParte([persona({ horasNormales: 20 })])),
  '20 horas en un día se rechaza',
)

ok(
  hayErrores(validarParte([persona({ horasNormales: -2 })])),
  'Horas negativas se rechazan',
)

ok(
  hayErrores(
    validarParte([
      persona({ asistencia: Asistencia.AUSENTE_CON_AVISO, horasNormales: 8 }),
    ]),
  ),
  'Ausente con horas cargadas se rechaza',
)

const presenteSinHoras = validarParte([persona({ horasNormales: 0 })])
ok(!hayErrores(presenteSinHoras), 'Presente sin horas NO bloquea')
ok(presenteSinHoras.length === 1 && presenteSinHoras[0].nivel === 'aviso', '  pero sí avisa')

console.log('\n  ── Doble presencia ──\n')
// Regla de CLAUDE.md: no puede estar PRESENTE en dos obras el mismo día
// con más de 12 horas sumadas. Con horas parciales se avisa, no se bloquea.
const dobleGrande = validarParte(
  [persona({ horasNormales: 8 })],
  new Map([['e1', [{ obra: 'SIG-2026-021', horas: 8 }]]]),
)
ok(hayErrores(dobleGrande), 'En dos obras con 16 h sumadas se BLOQUEA')
console.log(`    "${dobleGrande.find((p) => p.nivel === 'error')?.mensaje}"`)

const dobleChica = validarParte(
  [persona({ horasNormales: 4 })],
  new Map([['e1', [{ obra: 'SIG-2026-021', horas: 4 }]]]),
)
ok(!hayErrores(dobleChica), 'En dos obras con 8 h sumadas NO se bloquea')
ok(dobleChica.some((p) => p.nivel === 'aviso'), '  pero sí avisa')

const ausenteEnOtra = validarParte(
  [persona({ asistencia: Asistencia.AUSENTE_CON_AVISO, horasNormales: 0 })],
  new Map([['e1', [{ obra: 'SIG-2026-021', horas: 8 }]]]),
)
ok(!hayErrores(ausenteEnOtra), 'Si está ausente acá, no se cuenta la doble presencia')

console.log('\n  ── Estados del parte ──\n')
ok(sePuedeEditar(EstadoParte.BORRADOR), 'El borrador se edita')
ok(!sePuedeEditar(EstadoParte.ENVIADO), 'El enviado no se edita')
ok(!sePuedeEditar(EstadoParte.APROBADO), 'El aprobado no se edita')
ok(sePuedeAprobar(EstadoParte.ENVIADO), 'Solo se aprueba lo enviado')
ok(!sePuedeAprobar(EstadoParte.BORRADOR), 'Un borrador no se aprueba')
ok(!sePuedeAprobar(EstadoParte.APROBADO), 'No se aprueba dos veces')

console.log('\n  ── Quincenas ──\n')
const primera = quincenaDe(new Date(2026, 8, 7))
ok(primera.numero === 1, 'El 7 de septiembre cae en la 1ª quincena')
ok(primera.desde.getDate() === 1 && primera.hasta.getDate() === 15, '  del 1 al 15')

const segunda = quincenaDe(new Date(2026, 8, 20))
ok(segunda.numero === 2, 'El 20 de septiembre cae en la 2ª quincena')
ok(segunda.desde.getDate() === 16 && segunda.hasta.getDate() === 30, '  del 16 al 30')

const febrero = quincenaDe(new Date(2026, 1, 20))
ok(febrero.hasta.getDate() === 28, 'La 2ª de febrero 2026 termina el 28')

const limite = quincenaDe(new Date(2026, 8, 15))
ok(limite.numero === 1, 'El día 15 todavía es la 1ª quincena')
const limite2 = quincenaDe(new Date(2026, 8, 16))
ok(limite2.numero === 2, 'El día 16 ya es la 2ª')

console.log('\n  ── Días hábiles ──\n')
ok(esDiaHabil(new Date(2026, 8, 18)), 'El viernes 18/9 es hábil')
ok(!esDiaHabil(new Date(2026, 8, 19)), 'El sábado 19/9 no')
ok(!esDiaHabil(new Date(2026, 8, 20)), 'El domingo 20/9 tampoco')

const habiles = diasHabilesEntre(new Date(2026, 8, 14), new Date(2026, 8, 20))
ok(habiles.length === 5, 'Del lunes 14 al domingo 20 hay 5 días hábiles')
console.log()
