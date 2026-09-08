# Versionado y despliegue

## Versión actual

La versión preparada es **2.1.0**. Se muestra como `v2.1.0` en la barra lateral y en la pantalla de ingreso. El backend también la informa en `GET /api/v1/health`.

La versión de la aplicación debe coincidir en:

- `package.json`
- `backend/package.json`
- `frontend/package.json`

`packages/shared/package.json` conserva su versión propia porque es una biblioteca interna, no la versión desplegada de la aplicación.

## Criterio para aumentarla

- **PATCH** (`2.1.0` → `2.1.1`): corrección compatible, sin nueva función relevante.
- **MINOR** (`2.1.0` → `2.2.0`): mejora o función nueva compatible.
- **MAJOR** (`2.1.0` → `3.0.0`): cambio incompatible que exige una migración o procedimiento especial.

Para preparar una versión:

1. Actualizar la misma versión en los tres manifiestos indicados.
2. Ejecutar `npm install --package-lock-only --ignore-scripts` para sincronizar el lockfile.
3. Agregar la versión y sus cambios a `CHANGELOG.md`.
4. Ejecutar `npm run release:check`.
5. Crear el commit y, una vez elegido como release, la etiqueta Git `vMAJOR.MINOR.PATCH`.

`npm run version:check` falla si los tres números no coinciden. La compilación del frontend toma el número desde el `package.json` raíz, por lo que no hay textos de versión que modificar a mano.

## Procedimiento para el próximo despliegue

Los cambios están en la rama `codex/estabilizacion-produccion`. Un `git pull` sobre `main` no los incorpora por sí solo: antes del despliegue hay que fusionar esa rama a la rama productiva o desplegarla explícitamente.

En el servidor, sobre el repositorio ya configurado:

```bash
git fetch origin
git switch codex/estabilizacion-produccion
git pull --ff-only origin codex/estabilizacion-produccion
npm run version:check
git describe --tags --exact-match
```

El segundo comando de verificación debe mostrar `v2.1.0`. `npm run release:check` ya fue aprobado antes de publicar la etiqueta; no debe repetirse conectado a producción porque la integración crea una base descartable y requiere permisos para crear bases.

Después se ejecuta el procedimiento de despliegue que ya use el servidor. Con la instalación Docker actual:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

El backend aplica las migraciones pendientes al arrancar. No se debe ejecutar `npm run migrate:v1` contra la base existente salvo que se esté realizando el corte definitivo y se tenga el dump final de SEGUIT v1.

Antes de actualizar producción:

1. Hacer un backup verificable de PostgreSQL y de `uploads/`.
2. Confirmar que el repositorio está en el commit y la etiqueta esperados.
3. Ejecutar el control de release.
4. Desplegar y esperar a que terminen las migraciones.

Comprobación posterior en el despliegue Docker (cambiar el puerto si `HTTP_PORT` no es 80):

```bash
curl http://localhost/api/v1/health
```

En una instalación nativa con el backend expuesto directamente en su puerto predeterminado se usa `curl http://localhost:3001/api/v1/health`.

La respuesta debe incluir `"status":"ok"` y `"version":"2.1.0"`. La barra lateral también debe mostrar `v2.1.0`. Luego conviene probar ingreso, apertura de un equipo, ENTRADA, SALIDA y cambio de oficina con un equipo de prueba controlado.

## Rollback

Si el servicio no arranca y todavía no se realizaron movimientos con la versión nueva, volver a la imagen o commit anterior y conservar el backup. Si ya hubo ENTRADAS, SALIDAS o cambios de asignación, seguir el procedimiento de rollback de [Flujo de equipos y próximo deploy](FLUJO_EQUIPOS_Y_PROXIMO_DEPLOY.md), porque el estado de la base ya puede depender del modelo nuevo.
