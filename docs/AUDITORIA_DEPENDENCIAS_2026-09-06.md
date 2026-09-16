# PROSEGUIT — Auditoría inicial de dependencias

**Fecha:** 6 de septiembre de 2026

## Resultado inicial

Después de `npm ci`, npm reportó:

| Severidad | Cantidad |
|---|---:|
| Crítica | 2 |
| Alta | 21 |
| Moderada | 7 |
| Baja | 3 |
| **Total** | **33** |

## Acciones aplicadas

- Se eliminó de la raíz la duplicación de dependencias propias del backend.
- `@proseguit/shared` pasó a declarar directamente su dependencia de Zod.
- Multer se actualizó de la rama 1.x vulnerable a 2.3.0.
- Se aplicaron las actualizaciones compatibles propuestas por `npm audit fix`.
- Se alinearon Prisma Client, Prisma CLI y el adaptador PostgreSQL en 7.10.0.
- React Router quedó en 7.18.3, Vite en 8.2.2 y Concurrently en 9.2.4.
- El build completo y las 72 pruebas unitarias pasaron después de las actualizaciones.

## Resultado posterior

| Severidad | Cantidad |
|---|---:|
| Crítica | 0 |
| Alta | 4 |
| Moderada | 0 |
| Baja | 1 |
| **Total** | **5** |

## Riesgo pendiente

Los cuatro avisos altos restantes provienen de dependencias transitivas del CLI de Prisma (`deepmerge-ts` y `mysql2`). npm solo propone `npm audit fix --force`, que bajaría Prisma de 7 a 6 y constituye un cambio incompatible. No se aplicó esa operación.

El aviso bajo corresponde a `esbuild` y afecta al servidor de desarrollo en Windows.

### Mitigación prevista

- No exponer el CLI de Prisma como servicio de red.
- Separar herramientas de migración del runtime productivo.
- Construir una imagen/runtime final sin dependencias de desarrollo.
- Mantener Prisma y Vite actualizados y reevaluar los avisos en cada cambio de lockfile.
- Incorporar `npm audit` al pipeline con una política explícita de excepciones temporales.

Esta auditoría no se considera cerrada mientras queden avisos altos, aunque el riesgo sea propio de tooling y no de una ruta HTTP de la aplicación.
