/**
 * Une clases de Tailwind salteando las vacías, null y false.
 * No hace merge de conflictos: en esta app los componentes exponen `className`
 * al final de la lista, así que lo último que se pasa es lo que gana.
 */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}
