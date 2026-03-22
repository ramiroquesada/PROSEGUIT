# PROSEGUIT v2

Sistema de Gestión de Inventario IT — Intendencia de Soriano, Uruguay.

## Stack

- **Monorepo**: npm workspaces (`backend/`, `frontend/`, `packages/shared/`)
- **Backend**: Express 5 + TypeScript 5.9 + Prisma 7 + PostgreSQL 17
- **Frontend**: React 19 + TypeScript 5.9 + Vite 8 + CSS puro moderno (NO Tailwind)
- **Auth**: JWT (access + refresh tokens) + bcryptjs
- **Validación**: Zod 4 (compartido via `@proseguit/shared`)
- **Routing**: React Router 7
- **Estado servidor**: TanStack Query 5
- **Dev**: Docker Compose (PostgreSQL en puerto 5433)

## Comandos

```bash
# Desarrollo
npm run dev              # Inicia backend + frontend
npm run db:up            # Levanta PostgreSQL (Docker)
npm run db:migrate       # Prisma migrate dev
npm run db:studio        # Prisma Studio

# Backend
cd backend && npm run dev        # Express en :3001
cd backend && npm run seed       # Seed con usuarios iniciales

# Frontend
cd frontend && npm run dev       # Vite en :5173 (proxy /api -> :3001)
```

## Convenciones

- **CSS**: Módulos CSS con nesting nativo, custom properties, @layer. No Tailwind.
- **Colores**: Teal `#00A79D` (primario), Navy `#003366` (secundario)
- **React 19**: usar `use()` en vez de `useContext()`, `<Context value={}>` sin `.Provider`
- **Prisma 7**: requiere adapter (`@prisma/adapter-pg`), config en `prisma.config.ts`
- **Express 5**: async error handling nativo, nuevo path matching
- **Idioma UI**: Español (Uruguay)
- **API**: prefijo `/api/v1/`

## Estructura clave

- `backend/prisma/schema.prisma` — modelo de datos completo
- `backend/src/modules/` — módulos por dominio (auth, equipment, locations, etc.)
- `frontend/src/pages/` — páginas por ruta
- `frontend/src/components/layout/` — MainLayout, Sidebar, Header
- `frontend/src/lib/` — api-client (fetch+JWT), auth-context
- `packages/shared/src/` — tipos, schemas Zod, constantes compartidas

## Usuarios seed

- Admin: ficha `9999`, password `admin123`
- Técnico: ficha `7844`, password `7844` (forcePasswordChange: true)
