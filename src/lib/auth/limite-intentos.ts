import 'server-only'

/* =====================================================================
   Límite de intentos de login.

   Se guarda en memoria del proceso a propósito: en Vercel cada instancia
   tiene la suya y se reinicia sola, lo que para una app interna de
   diez usuarios alcanza y sobra. Si en algún momento hace falta algo
   compartido entre instancias, se reemplaza por Redis sin tocar quien
   lo llama.
   ===================================================================== */

const MAXIMO_INTENTOS = 5
const VENTANA_MINUTOS = 15
const BLOQUEO_MINUTOS = 15

interface Registro {
  intentos: number
  primerIntento: number
  bloqueadoHasta: number | null
}

const porClave = new Map<string, Registro>()

/** Limpia lo viejo para que el mapa no crezca indefinidamente. */
function limpiar(ahora: number): void {
  const limite = VENTANA_MINUTOS * 60_000
  for (const [clave, r] of porClave) {
    const vencido =
      ahora - r.primerIntento > limite &&
      (r.bloqueadoHasta === null || r.bloqueadoHasta < ahora)
    if (vencido) porClave.delete(clave)
  }
}

export interface EstadoIntentos {
  bloqueado: boolean
  intentosRestantes: number
  minutosParaReintentar: number
}

/**
 * Si se puede intentar entrar con esa clave.
 * La clave combina el email y la IP: así un atacante que prueba contra
 * muchos emails desde una IP también se frena.
 */
export function puedeIntentar(clave: string): EstadoIntentos {
  const ahora = Date.now()
  limpiar(ahora)

  const r = porClave.get(clave)
  if (!r) {
    return {
      bloqueado: false,
      intentosRestantes: MAXIMO_INTENTOS,
      minutosParaReintentar: 0,
    }
  }

  if (r.bloqueadoHasta !== null && r.bloqueadoHasta > ahora) {
    return {
      bloqueado: true,
      intentosRestantes: 0,
      minutosParaReintentar: Math.ceil((r.bloqueadoHasta - ahora) / 60_000),
    }
  }

  // Pasó la ventana: se empieza de cero.
  if (ahora - r.primerIntento > VENTANA_MINUTOS * 60_000) {
    porClave.delete(clave)
    return {
      bloqueado: false,
      intentosRestantes: MAXIMO_INTENTOS,
      minutosParaReintentar: 0,
    }
  }

  return {
    bloqueado: false,
    intentosRestantes: Math.max(0, MAXIMO_INTENTOS - r.intentos),
    minutosParaReintentar: 0,
  }
}

/** Un intento fallido. Devuelve el estado después de contarlo. */
export function registrarFallo(clave: string): EstadoIntentos {
  const ahora = Date.now()
  const r = porClave.get(clave)

  if (!r || ahora - r.primerIntento > VENTANA_MINUTOS * 60_000) {
    porClave.set(clave, {
      intentos: 1,
      primerIntento: ahora,
      bloqueadoHasta: null,
    })
    return {
      bloqueado: false,
      intentosRestantes: MAXIMO_INTENTOS - 1,
      minutosParaReintentar: 0,
    }
  }

  r.intentos += 1

  if (r.intentos >= MAXIMO_INTENTOS) {
    r.bloqueadoHasta = ahora + BLOQUEO_MINUTOS * 60_000
    return {
      bloqueado: true,
      intentosRestantes: 0,
      minutosParaReintentar: BLOQUEO_MINUTOS,
    }
  }

  return {
    bloqueado: false,
    intentosRestantes: MAXIMO_INTENTOS - r.intentos,
    minutosParaReintentar: 0,
  }
}

/** Entró bien: se limpia el contador. */
export function limpiarIntentos(clave: string): void {
  porClave.delete(clave)
}
