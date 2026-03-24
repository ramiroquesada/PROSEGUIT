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

4. **Correr migraciones**
   ```bash
   cd backend && npx prisma migrate dev && cd ..
   ```

5. **Generar Prisma Client**
   ```bash
   cd backend && npx prisma generate && cd ..
   ```

6. **Arrancar servidores**
   ```bash
   # En terminales separadas:
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

## Argumento "db": solo base de datos
```bash
docker compose up -d postgres
cd backend && npx prisma migrate dev && cd ..
```

## Argumento "backend": solo backend
```bash
cd backend && npm install && npm run dev
```

## Argumento "frontend": solo frontend
```bash
cd frontend && npm install && npm run dev
```

## Verificar que todo funciona
- PostgreSQL: `docker compose ps` (debe mostrar postgres healthy)
- Backend: http://localhost:3001/api/v1/health
- Frontend: http://localhost:5173

## Troubleshooting
- Si el puerto 5433 esta ocupado: `docker compose down && docker compose up -d postgres`
- Si Prisma falla: `cd backend && npx prisma migrate reset --force`
- Si npm falla: borrar `node_modules` y reinstalar
