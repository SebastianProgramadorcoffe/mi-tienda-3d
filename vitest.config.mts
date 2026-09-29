import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Las pruebas de reglas necesitan el emulador de Firestore: `npm run test:rules`.
    exclude: ['**/node_modules/**', 'tests/rules/**'],
  },
})
