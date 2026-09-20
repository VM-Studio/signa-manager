/**
 * Prueba la regla que decide qué campos de una obra se pueden editar.
 *
 * Llama a la MISMA función que usa la Server Action (camposAActualizar),
 * con un formulario que intenta cambiar todo, como si alguien le hubiera
 * sacado el `disabled` a los inputs desde el inspector del navegador.
 */
import './sin-server-only'
import { OrigenDato } from '@prisma/client'
import { camposAActualizar } from '../../src/server/obras/reglas'

const ok = (c: boolean, t: string) => {
  console.log(`${c ? '✔' : '✖'} ${t}`)
  if (!c) process.exitCode = 1
}

// Un formulario que intenta pisar TODO.
const formularioMalicioso = {
  // campos del sistema base
  codigo: 'HACKEADO-001',
  nombre: 'Nombre cambiado a mano',
  tipo: 'PROPIA',
  estado: 'FINALIZADA',
  cliente: 'Cliente inventado',
  unidadNegocioId: 'otra-unidad-cualquiera',
  presupuestoTotal: '1',
  fechaInicio: '',
  fechaFinPrevista: '',
  fechaFinReal: '',
  // campos nuestros
  jefeObraId: 'usuario-123',
  presupuestoManoObra: '12345678',
  direccion: 'Calle de prueba 123',
  localidad: 'Localidad de prueba',
  provincia: 'Buenos Aires',
  esInterior: 'on',
}

console.log('\n  ── Obra que viene del sistema base ──\n')
const delSistema = camposAActualizar(OrigenDato.SISTEMA_BASE, formularioMalicioso)

if (!delSistema.ok) {
  ok(false, `No debería haber fallado: ${JSON.stringify(delSistema.errores)}`)
} else {
  const campos = Object.keys(delSistema.datos)
  const prohibidos = [
    'codigo', 'nombre', 'tipo', 'estado', 'cliente',
    'unidadNegocio', 'presupuestoTotal',
    'fechaInicio', 'fechaFinPrevista', 'fechaFinReal',
  ]
  for (const campo of prohibidos) {
    ok(!campos.includes(campo), `${campo} NO se toca`)
  }
  ok(Number(delSistema.datos.presupuestoManoObra) === 12_345_678, 'presupuestoManoObra SÍ se guarda')
  ok(delSistema.datos.localidad === 'Localidad de prueba', 'localidad SÍ se guarda')
  ok(delSistema.datos.esInterior === true, 'esInterior SÍ se guarda')
  ok(delSistema.datos.direccion === 'Calle de prueba 123', 'direccion SÍ se guarda')
  console.log(`\n  Campos que se mandan a la base: ${campos.join(', ')}`)
}

console.log('\n  ── Obra cargada a mano en esta app ──\n')
const manual = camposAActualizar(OrigenDato.MANUAL, formularioMalicioso)

if (!manual.ok) {
  ok(false, `No debería haber fallado: ${JSON.stringify(manual.errores)}`)
} else {
  ok(manual.datos.codigo === 'HACKEADO-001', 'codigo SÍ se puede cambiar')
  ok(manual.datos.nombre === 'Nombre cambiado a mano', 'nombre SÍ se puede cambiar')
  ok(manual.datos.estado === 'FINALIZADA', 'estado SÍ se puede cambiar')
  ok(Number(manual.datos.presupuestoManoObra) === 12_345_678, 'presupuestoManoObra SÍ se guarda')
}

console.log('\n  ── Validación: un código demasiado corto ──\n')
const invalido = camposAActualizar(OrigenDato.MANUAL, {
  ...formularioMalicioso,
  codigo: 'AB',
})
ok(!invalido.ok, 'Una obra manual con código corto se rechaza')
if (!invalido.ok) {
  ok(Boolean(invalido.errores.codigo), `Con mensaje: "${invalido.errores.codigo}"`)
}

// La misma obra pero del sistema base: el código no se valida porque no se usa.
const invalidoDelSistema = camposAActualizar(OrigenDato.SISTEMA_BASE, {
  ...formularioMalicioso,
  codigo: 'AB',
})
ok(invalidoDelSistema.ok, 'En una obra del sistema base ese código ni se mira')
console.log()
