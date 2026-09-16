# PROSEGUIT — Línea base de estabilización

**Fecha:** 6 de septiembre de 2026  
**Rama de trabajo:** `codex/estabilizacion-produccion`  
**Commit de origen:** `be93c77fbf9ea30fb5b03077f5f524b93ce3639e`  
**Tag local de origen:** `baseline/pre-estabilizacion-2026-09-06`  
**Backup externo:** `C:\Users\ramir\Desktop\PROSEGUIT-backups\baseline-20260906-181334`

## Estado preservado

- PostgreSQL 17.9 activo en `proseguit-postgres`.
- Node.js 22.18.0.
- npm 11.7.0.
- Docker 29.1.2.
- Dumps, exportaciones y uploads fuera del seguimiento de Git.
- No se encontraron `.env`, dumps productivos, exportaciones ni uploads en el historial de Git.

## Contenido del backup

| Archivo | SHA-256 |
|---|---|
| `proseguit-postgres.dump` | `E55CF79FAE2E57C2406AB643582F33651E802EBD5608EEA99AFFB28BB890965F` |
| `db_seguit1.sql` | `89EEE5D6C93FFD0B83D35170531EB1DBDE02E51EA281CFA27B31F49A84D1A804` |
| `export_datos_v1.json` | `D0D0296ABE0CAD6C5D01AE60FAE31D67C9B746C302E11D71B7048C9426F3F356` |
| `resumen_datos_v1.txt` | `45A012002A5181BA5A9C110873BE0A902A2BACF2DD811084C44CA92446D8BB23` |
| `uploads/equipment/2605_1776121019595.png` | `7E19D9DCD2A5E524C62F567FEE1BFA46730EBEB3733E33C68D82D468ABCB5009` |

## Prueba de restauración

El dump `proseguit-postgres.dump` se restauró con `pg_restore` en una base descartable y se consultaron sus tablas antes de eliminarla.

| Entidad | Registros restaurados |
|---|---:|
| Usuarios | 12 |
| Ciudades | 9 |
| Secciones | 14 |
| Oficinas | 106 |
| Equipos | 1.307 |
| Historial | 4.261 |
| Préstamos totales | 43 |

**Resultado:** restauración verificada correctamente.

## Alcance de esta evidencia

La restauración demuestra que el backup puede reconstruir la base y recuperar sus registros. No afirma todavía que todos los datos sean funcionalmente correctos; las inconsistencias detectadas se tratarán en la fase de saneamiento.
