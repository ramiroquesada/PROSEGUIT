# PROSEGUIT — Auditoría inicial de integridad de datos

**Fecha:** 6 de septiembre de 2026  
**Método:** auditor de solo lectura `npm run audit:data --workspace=backend`  
**Estado:** no se modificó ningún registro.

> Esta base es un ensayo de desarrollo. SEGUIT v1 seguirá siendo la fuente de verdad hasta el corte y la migración se ejecutará nuevamente sobre un dump final. Los hallazgos de este documento sirven para mejorar el importador y diseñar el registro de anomalías; no se corregirán manualmente como si fueran datos definitivos.

## Totales observados

| Entidad | Cantidad |
|---|---:|
| Equipos | 1.307 |
| Préstamos totales | 43 |
| Préstamos activos | 13 |
| Equipos con préstamo activo | 10 |
| Ciudades | 9 |
| Secciones | 14 |
| Oficinas | 106 |

## Errores de integridad

### Préstamos activos duplicados

| Serie de equipo | IDs de préstamos activos | Fechas | Observación inicial |
|---:|---|---|---|
| 641 | 12, 14 | 2022-04-04 y 2022-05-09 | Mismo solicitante histórico, destinos diferentes; necesita validación funcional. |
| 642 | 10, 13 | 2021-12-01 y 2022-04-21 | Solicitantes y destinos diferentes; necesita validación funcional. |
| 1307 | 42, 43 | 2026-02-12 y 2026-02-12 | Registros aparentemente idénticos; candidato a duplicación técnica. |

Los seis registros carecen de fecha de devolución y continúan marcados como activos. No se eliminará ni cerrará ninguno hasta confirmar el préstamo real vigente.

### Estado de equipos prestados

- Los 10 equipos con préstamo activo conservan `ACTIVO` como estado almacenado.
- Ningún equipo figura como `PRESTADO` sin préstamo activo.
- El indicador `activo` y la fecha de devolución son coherentes en los 43 préstamos.

Esto confirma que la migración creó los préstamos pero no actualizó el estado de sus equipos.

## Advertencias

- 296 equipos sin proceso especial tienen un estado almacenado distinto al derivado por el tipo de oficina.
- 3 equipos no tienen ningún evento de historial: series 1, 2 y 1449.
- Los 12 usuarios activos aparecen sin cambio obligatorio de contraseña pendiente.

Los 296 estados no deben actualizarse en masa todavía. La aplicación combina estados persistidos para procesos especiales con estados derivados por ubicación; primero se debe acordar y programar una única regla.

## Controles sin errores

- 0 préstamos cuyo indicador `activo` contradiga la fecha de devolución.
- 0 equipos `PRESTADO` sin préstamo activo.
- 0 servicios externos abiertos con estado incorrecto.
- 0 equipos en servicio externo sin envío abierto.
- 0 equipos con préstamo y servicio externo abiertos simultáneamente.

## Información de preparación de datos

- 8 ciudades todavía no tienen secciones; esto se considera trabajo de clasificación pendiente.
- 2 secciones no tienen oficinas.
- 5 oficinas no tienen equipos.
- Existen 10 refresh tokens vencidos que podrán purgarse durante el saneamiento de autenticación.

## Tratamiento correcto de los hallazgos

1. Marcar los duplicados y demás inconsistencias como anomalías de migración `A_REVISAR`.
2. No editar manualmente los préstamos del snapshot actual.
3. Incorporar al importador las reparaciones que puedan demostrarse inequívocas.
4. Mantener las decisiones ambiguas en una cola de revisión con la evidencia original.
5. Repetir auditoría y revisión con el dump final tomado durante el corte.
6. Definir si el estado será completamente persistido o derivado mediante una función de dominio única.

## Próxima implementación segura

Se puede corregir el servicio para que préstamo, estado e historial se escriban dentro de una única transacción y agregar la prueba de concurrencia. Esto protege todos los datos nuevos creados en PROSEGUIT v2. La restricción única en PostgreSQL se aplicará después de resolver las anomalías generadas por la importación definitiva.
