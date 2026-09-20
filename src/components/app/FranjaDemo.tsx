/**
 * Franja fina que avisa que los datos son de ejemplo.
 * Solo aparece con MODO_DEMO en true. Se apoya justo debajo del header,
 * que es quien ya se corrió por el área segura del teléfono.
 */
export function FranjaDemo() {
  return (
    <p
      className="fixed inset-x-0 z-20 bg-aviso py-1 text-center text-micro font-medium text-blanco"
      style={{ top: 'calc(var(--alto-header) + env(safe-area-inset-top, 0px))' }}
    >
      Versión de demostración con datos de ejemplo
    </p>
  )
}
