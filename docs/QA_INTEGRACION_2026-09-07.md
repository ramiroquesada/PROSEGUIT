# QA de integración aislado — 2026-09-07

## Resultado

- 4 archivos de pruebas aprobados.
- 31 pruebas de integración aprobadas sobre 17 migraciones aplicadas desde cero.
- La batería incorpora una regresión que abre el detalle del equipo después de aplicar todas las migraciones desde cero.
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

El QA visual sobre una segunda base descartable detectó otra diferencia: `EquipoImagen` utilizaba `descripcion` y `deleted_at`, pero esos campos habían llegado a desarrollo mediante sincronización de schema y no figuraban en la cadena de migraciones. La pantalla de alta creaba el equipo y luego el detalle respondía `500`. La migración `20260908002000_add_equipment_image_metadata` incorpora ambos campos con `IF NOT EXISTS`, y el nuevo test de detalle impide que el defecto reaparezca.

## QA visual del flujo operativo

Se recorrió la interfaz completa sobre `proseguit_test_manual_20260907_2015`, eliminada al finalizar. Resultados:

- alta en Mantenimiento con oficina asignada distinta;
- Mantenimiento ausente de todos los selectores de oficina asignable;
- SALIDA inicial exclusivamente a la oficina asignada;
- fuera de Mantenimiento sólo se ofreció ENTRADA, sin cambio de asignación;
- ENTRADA conservando la oficina asignada;
- cambio de asignación dentro de Mantenimiento y segunda SALIDA al nuevo destino;
- creación de una ciudad y de una sección definitiva dentro del diálogo de movimiento;
- movimiento de la oficina entre ciudades con un equipo afectado y actualización inmediata de su ruta;
- equipo visible tanto en su oficina dueña con “Ahora: Mantenimiento” como en el panel de Mantenimiento;
- dashboard e historial mostrando Entrada, Salida y Cambio de oficina asignada con los nuevos nombres.

No se usó la base de desarrollo para el recorrido. Al finalizar se detuvieron los servidores de QA y se eliminó la base temporal.

## Cobertura actual

- autenticación de administrador y técnico;
- permisos básicos por rol;
- validaciones Zod de entradas inválidas;
- alta de equipo en Mantenimiento, cambio de oficina asignada, ENTRADA y SALIDA;
- separación entre inventario asignado a una oficina y equipos actualmente en Mantenimiento;
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
