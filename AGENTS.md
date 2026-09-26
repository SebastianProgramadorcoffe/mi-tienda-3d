<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

Correr con `npm run test` (Vitest + React Testing Library, entorno jsdom). Ver `TESTING.md` para la filosofía y las convenciones completas.

- 100% de cobertura es la meta — los tests son lo que hace seguro avanzar rápido.
- Al escribir una función nueva, escribir su test correspondiente.
- Al arreglar un bug, escribir un test de regresión que reproduzca el bug.
- Al agregar manejo de errores, escribir un test que dispare ese error.
- Al agregar un condicional (if/else, switch), escribir tests para AMBAS ramas.
- Nunca commitear código que rompa tests existentes.
