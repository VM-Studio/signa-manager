/**
 * Armado de archivos CSV para Excel en español.
 *
 * Detalles que importan: Excel en configuración regional argentina
 * espera punto y coma como separador y coma como decimal, y necesita el
 * BOM al principio para no romper las tildes.
 */

export const SEPARADOR = ';'

function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return ''

  if (typeof valor === 'number') {
    // Coma decimal, sin separador de miles: así Excel lo toma como número.
    return valor.toString().replace('.', ',')
  }

  if (valor instanceof Date) {
    const d = String(valor.getDate()).padStart(2, '0')
    const m = String(valor.getMonth() + 1).padStart(2, '0')
    return `${d}/${m}/${valor.getFullYear()}`
  }

  const texto = String(valor)
  // Si tiene el separador, comillas o saltos de línea, va entre comillas.
  if (texto.includes(SEPARADOR) || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export function filaCsv(celdas: unknown[]): string {
  return celdas.map(escapar).join(SEPARADOR)
}

export interface HojaCsv {
  titulo: string
  encabezados: string[]
  filas: unknown[][]
}

/**
 * Varias "hojas" en un solo CSV, separadas por su título.
 * Un CSV no tiene hojas de verdad, pero el estudio contable lo abre en
 * Excel y con los títulos separados se entiende igual.
 */
export function armarCsv(hojas: HojaCsv[]): string {
  const bloques = hojas.map((hoja) => {
    const lineas = [
      hoja.titulo.toUpperCase(),
      filaCsv(hoja.encabezados),
      ...hoja.filas.map(filaCsv),
    ]
    return lineas.join('\r\n')
  })

  // El BOM es lo que hace que Excel muestre bien las tildes y las eñes.
  return `﻿${bloques.join('\r\n\r\n')}\r\n`
}

export function nombreArchivo(base: string): string {
  const hoy = new Date()
  const sello = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  return `${base}-${sello}.csv`
}
