import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // `server-only` es un centinela del bundler de Next: fuera de él
      // tira error, así que en las pruebas se reemplaza por un módulo vacío.
      'server-only': resolve(__dirname, 'pruebas/vacio.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['pruebas/**/*.prueba.ts'],
  },
})
