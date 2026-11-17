---
name: dev-setup
description: Levantar el entorno de desarrollo completo de PROSEGUIT. Usa cuando necesites iniciar Docker, instalar dependencias, correr migraciones o arrancar los servidores de desarrollo.
allowed-tools: Bash(docker *), Bash(npm *), Bash(npx prisma *)
argument-hint: "[db|backend|frontend|all]"
---

# Dev Setup - PROSEGUIT

Levanta el entorno de desarrollo del proyecto.

## Sin argumentos o "all": entorno completo

1. **Verificar Docker** esta corriendo
   ```bash
   docker info > /dev/null 2>&1 || echo "ERROR: Docker no esta corriendo"
   ```

2. **Levantar PostgreSQL**
   ```bash
   docker compose up -d postgres
   ```

3. **Instalar dependencias**
   ```bash
   npm install
   ```

4. **Aplicar migraciones pendientes**
   ```bash
   cd backend && npx prisma migrate deploy && cd ..
   ```
   Usar `migrate deploy`, no `migrate dev`: la base local tiene una desviación conocida (default de `equipo.estado`) y `migrate dev` ofrecería resetearla, borrando los datos. Para crear una migración nueva, ver el skill `prisma7` y la sección de enums de CLAUDE.md.

5. **Arrancar servidores** (compila `@proseguit/shared`, genera el cliente Prisma y levanta ambos)
   ```bash
   npm run dev
   ```
   Si `concurrently` falla: `npm run dev:backend` y `npm run dev:frontend` en terminales separadas.

## Argumento "db": solo base de datos
```bash
docker compose up -d postgres
cd backend && npx prisma migrate deploy && cd ..
```

## Argumento "backend": solo backend
```bash
npm install && npm run dev:backend
```

## Argumento "frontend": solo frontend
```bash
npm install && npm run dev:frontend
```

## Migración de datos desde seguit v1

Cuando se trae un dump SQL de seguit v1 (`db_seguit1.sql`):

1. Colocar `db_seguit1.sql` en la raíz del proyecto (`PROSEGUIT/`)
2. Asegurarse de que la DB esté corriendo: `docker compose up -d postgres`
3. Correr el comando único de migración:
   ```bash
   npm run migrate:v1
   ```

El comando encadena automáticamente:
- `node extract_data.js` — extrae datos del SQL a JSON
- Pre-flight checks: verifica conexión, detecta y repara migraciones incompletas (`estado_equipo_old`)
- `prisma migrate deploy` — aplica migraciones pendientes
- `prisma generate` — regenera el cliente
- Importación completa de datos (ubicaciones, tipos, usuarios, equipos, historial, préstamos)

## Verificar que todo funciona
- PostgreSQL: `docker compose ps` (debe mostrar postgres healthy)
- Backend: http://localhost:3001/api/v1/health
- Frontend: http://localhost:5173

## Troubleshooting
- Si el puerto 5433 esta ocupado: `docker compose down && docker compose up -d postgres`
- Si Prisma falla: `cd backend && npx prisma migrate status` para ver qué falta. `npx prisma migrate reset --force` **borra toda la base local**: sólo con el OK del usuario
- Si falta la oficina "Stock disponible" (alta de equipos da error): la crean la migración `20261117000100_ensure_stock_office` y `npm run db:seed`
- Si npm falla: borrar `node_modules` y reinstalar
- Si migrate:v1 falla con "export_datos_v1.json no encontrado": verificar que `db_seguit1.sql` está en la raíz
- Si migrate:v1 falla con "No se puede conectar": correr `npm run db:up` primero
