import { defineConfig } from 'vitest/config'

// Pruebas de firestore.rules contra el emulador local. Se corren con
// `npm run test:rules`, que levanta el emulador (requiere Java 21+).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
