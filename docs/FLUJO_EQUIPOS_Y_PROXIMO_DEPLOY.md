# Flujo de equipos y próximo deploy

## Regla funcional

PROSEGUIT guarda dos ubicaciones distintas:

- **Oficina asignada:** el lugar al que pertenece el equipo.
- **Ubicación actual:** el lugar donde está en este momento.

Las acciones principales quedan así:

1. **ENTRADA:** mueve la ubicación actual a **Mantenimiento** y conserva la oficina asignada.
2. Mientras está en Mantenimiento se puede cambiar su oficina asignada.
3. **SALIDA:** mueve el equipo únicamente a su oficina asignada. El usuario no elige otro destino en esa acción.
4. Un equipo fuera de Mantenimiento no puede cambiar de oficina asignada.
5. **Informática - Soporte** continúa siendo una oficina asignable. **Mantenimiento** es la ubicación temporal y no puede asignarse como oficina dueña.
6. Un envío a servicio externo solamente puede iniciarse desde Mantenimiento; al regresar vuelve allí y necesita una SALIDA posterior.

En la jerarquía, las oficinas normales muestran los equipos que tienen asignados. Mantenimiento es la excepción: muestra los equipos que están actualmente adentro.

## Qué cambió en los datos de desarrollo

La migración `20260908000000_add_equipment_assignment`:

- agregó `equipo.oficina_asignada_id`;
- copió inicialmente `equipo.oficina_id` a ese campo para mantener compatibilidad;
- agregó el tipo de oficina `MANTENIMIENTO`;
- cambió a ese tipo únicamente la oficina cuyo nombre normalizado es exactamente `Mantenimiento`.

La migración complementaria `20260908001000_ensure_maintenance_office` crea esa oficina lógica junto a Soporte solamente si la instalación existente todavía no la tiene. No mueve ni reasigna equipos.

No mueve equipos, no elimina registros y no intenta reconstruir datos históricos. Por eso una base ya importada con la lógica anterior sigue funcionando, pero no recupera por sí sola los valores de `ubicacion_tmp` descartados durante aquella importación.

## Camino recomendado para el próximo corte de producción

SEGUIT v1 continúa siendo la fuente de verdad hasta el corte. El camino recomendado es:

1. Probar el código candidato fuera de producción:

   ```bash
   npm ci
   npm run release:check
   ```

2. Tomar y conservar un backup de SEGUIT v1, de la base PROSEGUIT existente y de `uploads`.
3. Obtener el dump final de SEGUIT v1 y colocarlo como `db_seguit1.sql` en la raíz del proyecto.
4. Ensayar sobre una base vacía y descartable configurando allí `DATABASE_URL`:

   ```bash
   npm run migrate:v1
   npm run audit:data --workspace=backend
   ```

5. Revisar totales y anomalías. Las ubicaciones temporales desconocidas deben quedar marcadas; no se corrigen automáticamente.
6. Repetir exactamente la misma importación sobre la base definitiva durante la ventana de corte.
7. Levantar la nueva versión, comprobar inicio de sesión, búsqueda de equipos, ENTRADA, cambio de oficina asignada y SALIDA antes de habilitar el uso normal.

`npm run migrate:v1` borra los datos funcionales de la base indicada por `DATABASE_URL` antes de importar. Nunca debe apuntar accidentalmente a la base vigente sin backup y sin estar dentro de la ventana de corte.

## Alternativa: actualizar la base existente

Si se necesita desplegar el código sin rehacer todavía la importación, basta aplicar las migraciones (`npm run migrate:prod --workspace=backend`; en Docker se ejecutan al iniciar el backend). Esta alternativa conserva todo, pero toma la ubicación anterior como actual y asignada, por lo que no reconstruye los equipos que SEGUIT v1 tenía temporalmente en Mantenimiento.

## Vuelta atrás

La migración de esquema es aditiva y el código anterior ignora la columna nueva. Si la aplicación nueva todavía no recibió movimientos, se puede volver a la versión anterior conservando la base. Si ya hubo ENTRADAS, SALIDAS o cambios de asignación, la vuelta atrás correcta es restaurar el backup tomado en el corte para no mezclar los dos modelos de ubicación.
