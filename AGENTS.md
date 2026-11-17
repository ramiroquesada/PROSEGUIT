# Instrucciones para agentes

La documentación completa del proyecto está en [CLAUDE.md](CLAUDE.md).

## Si te piden actualizar / deployar producción

1. Si existe [DEPLOY_PENDIENTE.md](DEPLOY_PENDIENTE.md) en la raíz, **leelo primero y seguilo**: tiene los pasos específicos de la versión nueva, incluidos los pasos manuales que requieren confirmación de Ramiro.
2. El procedimiento general está en [docs/VERSIONADO_Y_DEPLOY.md](docs/VERSIONADO_Y_DEPLOY.md): se deploya con `./scripts/deploy.sh` desde `main`.
3. Nunca correr `npm run migrate:v1`, `prisma db push` ni el seed contra la base de producción, ni modificar archivos versionados en el servidor.
