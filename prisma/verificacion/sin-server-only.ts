/**
 * Los módulos del servidor llevan `import 'server-only'`, que es un
 * centinela del bundler de Next y tira error fuera de él. Para poder
 * probarlos desde un script suelto se lo reemplaza por un módulo vacío.
 */
import Module from 'node:module'

type Cargador = (
  pedido: string,
  padre: unknown,
  esPrincipal: boolean,
) => unknown

const moduloConCarga = Module as unknown as { _load: Cargador }
const original = moduloConCarga._load

moduloConCarga._load = function (pedido, padre, esPrincipal) {
  if (pedido === 'server-only' || pedido === 'client-only') return {}
  return original.call(this, pedido, padre, esPrincipal)
}
