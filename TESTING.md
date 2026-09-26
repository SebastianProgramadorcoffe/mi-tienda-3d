# Testing

100% de cobertura de tests es la clave del "vibe coding" bien hecho. Los tests permiten avanzar rápido, confiar en el instinto y publicar con confianza — sin ellos, vibe coding es solo yolo coding. Con tests, es una superpotencia.

## Framework

**Vitest 5** + **React Testing Library** + **jsdom**. Config en `vitest.config.mts`, setup global en `vitest.setup.ts`.

## Cómo correr los tests

```bash
npm run test        # corre toda la suite una vez (usa esto en CI y antes de commitear)
npx vitest           # modo watch, para desarrollo local
```

## Capas de tests

- **Unit tests** (`src/**/*.test.ts(x)`, junto al archivo que prueban): funciones puras y lógica de negocio aislada — mapeo de datos, cálculos, helpers. La mayoría de los tests del proyecto viven acá.
- **Integration tests**: componentes React que combinan varias piezas (context + UI). Usar `@testing-library/react` (`render`, `screen`) y consultar por rol/texto visible, no por implementación interna.
- **Smoke tests**: por ahora cubiertos por `npm run build` (export estático) — si el build falla, algo está roto.
- **E2E tests**: no configurados todavía. El checkout con Wompi (redirect a un dominio externo) y los componentes 3D (`<model-viewer>`) son mejores candidatos para Playwright que para Vitest — Vitest no soporta bien Server Components async ni WebGL real.

## Convenciones

- Nombre de archivo: `nombre-del-modulo.test.ts` junto al módulo que prueba (no en una carpeta `__tests__/` separada).
- Mensajes de test (`describe`/`it`) en español, describiendo comportamiento real, no implementación ("mapea APPROVED de Wompi a estado pagado", no "test 1").
- Nunca `expect(x).toBeDefined()` como única aserción — probar qué HACE el código, con valores concretos.
- Si un módulo importa algo con efectos secundarios a nivel de módulo (como `src/lib/firebase.ts`, que llama `getAuth()` con las env vars reales), mockearlo con `vi.mock(...)` en vez de dejar que se ejecute de verdad en el test.
- Nunca importar secretos, API keys o credenciales reales en archivos de test.
