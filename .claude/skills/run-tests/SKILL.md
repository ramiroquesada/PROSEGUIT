---
name: run-tests
description: Correr tests del backend de PROSEGUIT (unitarios e integración). Usa despues de hacer cambios de codigo para verificar que todo funciona.
allowed-tools: Bash(npm test *), Bash(npm run test*), Bash(npx vitest *)
argument-hint: "[unit|integration|all|archivo-especifico]"
---

# Run Tests - PROSEGUIT

Los tests están en el backend (Vitest). El frontend no tiene tests: para verificarlo, `npm run build --workspace=frontend` (tsc + vite) y probar en el navegador.

## Sin argumentos o "unit": tests unitarios (~140, no requieren DB)
```bash
npm test
```
Desde la raíz: compila `@proseguit/shared`, genera el cliente Prisma y corre Vitest excluyendo `src/__tests__/`.

## Argumento "integration": tests de integración (~45)
```bash
cd backend && npm run test:integration
```
Crea una base temporal `proseguit_test_*` en el PostgreSQL local y le aplica toda la cadena de migraciones desde cero, así que también valida que las migraciones nuevas corren. Requiere la DB levantada (`npm run db:up`).

## Argumento "all"
```bash
npm test && (cd backend && npm run test:integration)
```
Antes de un release: `npm run release:check` (versiones + build + unitarios + integración).

## Archivo especifico
```bash
cd backend && npx vitest run $ARGUMENTS
```

## Watch mode (desarrollo)
```bash
cd backend && npm run test:watch
```

## Cuando un test falla
1. Leer el mensaje de error completo
2. Identificar el archivo y linea del fallo
3. Verificar si el test esta desactualizado o si hay un bug real
4. Correr solo ese test: `cd backend && npx vitest run path/to/test.ts`
5. Fixear y re-correr
6. Si cambiaste `packages/shared`, recompilarlo (`npm run build:shared`) antes de correr Vitest directo
