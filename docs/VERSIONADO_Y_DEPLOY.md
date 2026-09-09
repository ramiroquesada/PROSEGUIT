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

La única rama de despliegue es `main`. El procedimiento reproducible para el servidor con Docker Compose es:

```bash
./scripts/deploy.sh
```

El script exige un árbol de trabajo limpio, actualiza `main` con `git pull --ff-only`, crea y comprueba un backup de PostgreSQL y `uploads/`, reconstruye los servicios, aplica las migraciones mediante el arranque del backend y valida `GET /api/v1/health` contra la versión del release. Los backups quedan fuera de Git en `backups/` (o en la ruta indicada por `BACKUPS_ROOT`).

Solo para una instalación inicial sin servicios ni datos previos se permite:

```bash
./scripts/deploy.sh --first-deploy
```

No se debe ejecutar `npm run migrate:v1` ni `prisma db push` contra la base existente. `npm run release:check` ya fue aprobado antes de publicar el código; no debe repetirse conectado a producción porque la integración crea una base descartable y requiere permisos para crear bases.

Comprobación posterior en el despliegue Docker (cambiar el puerto si `HTTP_PORT` no es 80):

```bash
curl http://localhost/api/v1/health
```

En una instalación nativa con el backend expuesto directamente en su puerto predeterminado se usa `curl http://localhost:3001/api/v1/health`.

La respuesta debe incluir `"status":"ok"` y `"version":"2.1.0"`. La barra lateral también debe mostrar `v2.1.0`. Luego conviene probar ingreso, apertura de un equipo, ENTRADA, SALIDA y cambio de oficina con un equipo de prueba controlado.

## Rollback

Si el servicio no arranca y todavía no se realizaron movimientos con la versión nueva, volver a la imagen o commit anterior y conservar el backup. Si ya hubo ENTRADAS, SALIDAS o cambios de asignación, seguir el procedimiento de rollback de [Flujo de equipos y próximo deploy](FLUJO_EQUIPOS_Y_PROXIMO_DEPLOY.md), porque el estado de la base ya puede depender del modelo nuevo.
