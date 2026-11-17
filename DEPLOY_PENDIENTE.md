# Deploy pendiente: control de stock de equipos (fase 1)

> **Para el agente que actualiza el servidor de producción (opencode u otro).**
> Leé esto completo antes de ejecutar nada. Cuando el deploy y el paso manual estén cerrados,
> avisale a Ramiro; él decide si se borra este archivo en un commit posterior (no lo borres vos en el servidor).

## Qué trae esta versión (v2.4.0)

- Nueva sección **Stock** (`/stock`): equipos disponibles agrupados por tipo, etapas *A revisar* / *Listo*, días en stock.
- Los equipos nuevos se crean siempre en la oficina **"Stock disponible"** (estado Nuevo). Desde la ficha se asignan a una oficina.
- El estado de un equipo se deriva del **tipo** de su oficina actual (nuevo tipo `STOCK` → estado `DISPONIBLE`).
- Botón **Pasar a stock** en la ficha y **condición** del equipo (Bueno / Con detalles / Solo para repuestos).
- El ciclo Mantenimiento (ENTRADA / SALIDA a su oficina) sigue igual.

## Cambios en la base (se aplican solos)

Tres migraciones **aditivas**, aplicadas por el backend al arrancar (`prisma migrate deploy`):

| Migración | Qué hace |
|-----------|----------|
| `20261117000000_add_stock_types` | Agrega `STOCK` a `tipo_oficina`, `DISPONIBLE` a `estado_equipo`, el enum `etapa_stock` y dos columnas nulas en `equipo` (`stock_etapa`, `stock_desde`). |
| `20261117000100_ensure_stock_office` | Crea la oficina "Stock disponible" (tipo STOCK) si no existe. Idempotente. |
| `20261118000000_add_condicion_equipo` | Crea el enum `condicion_equipo` y la columna nula `equipo.condicion`. Los equipos existentes quedan sin condición. |

No modifican ni borran filas existentes. Ningún equipo cambia de lugar por el deploy.

## Pasos

Trabajar en el directorio del repo en el servidor, en la rama `main`.

1. **Deploy normal**, con el script de siempre (exige árbol limpio, hace backup de PostgreSQL y `uploads/`, `git pull --ff-only`, rebuild y health check):

   ```bash
   ./scripts/deploy.sh
   ```

   Si falla, **no sigas**: mostrale la salida a Ramiro. Los backups quedan en `backups/`.

2. **Comprobar** que respondió bien:

   ```bash
   curl http://127.0.0.1:${HTTP_PORT:-80}/api/v1/health
   ```

   Debe tener `"status":"ok"`, `"version":"2.4.0"` y la base conectada.

3. **Vista previa del pasaje de equipos NUEVO a Stock** (no modifica nada). Los equipos nuevos que con el flujo anterior quedaron esperando en Mantenimiento se pasan a Stock con un script de una sola vez:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production exec backend node dist/scripts/pasar-nuevos-a-stock.js
   ```

   La salida muestra la oficina de Stock encontrada, la lista **"SE MOVERÍAN A STOCK"** y la lista **"QUEDAN AFUERA, REVISAR A MANO"** (con el motivo). **Mostrale a Ramiro la salida completa.**

4. **Aplicar sólo si Ramiro lo confirma explícitamente** después de ver la vista previa:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production exec backend node dist/scripts/pasar-nuevos-a-stock.js --apply
   ```

   - Es transaccional: si algún equipo cambió entre la vista previa y la aplicación, no mueve ninguno (volver a correr la vista previa).
   - Correrlo dos veces no hace nada la segunda vez.
   - Opciones: `--todas-las-oficinas` (incluye NUEVO asignados a oficinas que no son Soporte) y `--ficha=NNNN` (usuario del historial). Usarlas sólo si Ramiro lo pide.

5. **Prueba rápida** sugerida para Ramiro desde el navegador: entrar, abrir `/stock`, ver un equipo y la barra lateral con el ítem *Stock*.

## No hacer

- No correr `npm run migrate:v1`, `prisma db push`, `prisma migrate dev`, el seed ni `npm run release:check` contra producción.
- No editar, crear ni borrar archivos versionados en el servidor (`deploy.sh` necesita el árbol limpio). No commitear desde el servidor.
- No ejecutar el paso 4 sin confirmación de Ramiro.
- No tocar `.env.production` ni mostrar su contenido.

## Rollback

Si el backend no arranca y todavía no hubo movimientos con la versión nueva: volver al commit anterior y redeployar; el backup del paso 1 está en `backups/`. Si ya hubo movimientos, seguir [docs/FLUJO_EQUIPOS_Y_PROXIMO_DEPLOY.md](docs/FLUJO_EQUIPOS_Y_PROXIMO_DEPLOY.md) y [docs/VERSIONADO_Y_DEPLOY.md](docs/VERSIONADO_Y_DEPLOY.md). Las columnas y tipos nuevos no molestan a la versión anterior.
