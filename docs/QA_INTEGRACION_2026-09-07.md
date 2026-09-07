# QA de integración aislado — 2026-09-07

## Resultado

- 4 archivos de pruebas aprobados.
- 25 pruebas de integración aprobadas.
- La prueba de dos préstamos simultáneos produjo una creación `201` y un rechazo `400`.
- El backend compila sin depender de que haya un servidor escuchando en el puerto 3001.

## Aislamiento implementado

El comando `npm run test:integration --workspace=backend` ahora:

1. crea una base PostgreSQL con nombre único `proseguit_test_*`;
2. aplica todas las migraciones desde cero;
3. carga únicamente fixtures mínimos de QA;
4. ejecuta Express en memoria con Supertest;
5. termina conexiones y elimina la base en un bloque `finally`, tanto si las pruebas pasan como si fallan.

El seed incorpora además una validación defensiva: se niega a ejecutarse si la URL no apunta a una base cuyo nombre comienza con `proseguit_test_`.

## Defecto encontrado y corregido

La primera ejecución real reveló que Prisma 7 no podía deserializar el tipo PostgreSQL `void` devuelto por `pg_advisory_xact_lock`. Esto hacía que ambos intentos concurrentes terminaran en `500`, aunque el diseño del bloqueo fuera correcto.

Se convirtió el resultado del bloqueo a `text`. La segunda ejecución confirmó que el bloqueo serializa ambos pedidos y que el segundo se rechaza al encontrar el préstamo activo.

## Cobertura actual

- autenticación de administrador y técnico;
- permisos básicos por rol;
- validaciones Zod de entradas inválidas;
- alta y transferencia de equipo;
- historial de movimientos;
- envío y retorno de servicio externo;
- préstamo concurrente del mismo equipo.
- movimiento transaccional de una oficina entre ciudades, con conteo de equipos y auditoría del administrador.

## Cobertura todavía pendiente

- operaciones de error y conflictos restantes para ciudades, secciones y oficinas;
- carga y eliminación de imágenes;
- préstamos y devoluciones idempotentes;
- importación masiva;
- pruebas de componentes frontend y recorridos E2E.
