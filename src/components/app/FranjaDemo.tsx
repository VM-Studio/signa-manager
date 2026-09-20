/**
 * Franja fina que avisa que los datos son de ejemplo.
 *
 * Va en carbón con texto gris claro, no en ámbar: antes competía con
 * los avisos de verdad y en una pantalla llena de alertas reales eso
 * confunde. Es información de contexto, no un estado.
 *
 * Solo aparece con MODO_DEMO en true.
 */
export function FranjaDemo() {
  return (
    <p className="flex h-7 items-center justify-center bg-carbon px-4 text-center text-micro text-niebla">
      Versión de demostración con datos de ejemplo
    </p>
  )
}
