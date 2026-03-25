# PROSEGUIT v2

> Sistema de Gestión de Inventario IT — Intendencia de Soriano, Uruguay

Sistema web para gestionar el inventario de equipos informáticos de la Intendencia: ~2000 equipos distribuidos en más de 100 ubicaciones, con historial completo de movimientos, préstamos, envíos a servicio externo y soporte técnico.

---

## Tecnologías

| Capa | Stack |
|------|-------|
| **Backend** | Express 5 · TypeScript 5.9 · Prisma 7 · PostgreSQL 17 |
| **Frontend** | React 19 · TypeScript 5.9 · Vite 8 · CSS Modules puro · Lucide React |
| **Auth** | JWT (access + refresh tokens) · bcryptjs |
| **Validación** | Zod 4 |
| **Routing** | React Router 7 |
| **Estado** | TanStack Query 5 |
| **Dev** | Docker Compose |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/ramiroquesada/PROSEGUIT.git
cd PROSEGUIT

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example backend/.env
# Editar backend/.env si es necesario

# 4. Levantar la base de datos
npm run db:up

# 5. Correr migraciones y seed inicial
npm run db:migrate
cd backend && npx tsx prisma/seed.ts && cd ..

# 6. Iniciar servidores de desarrollo
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/v1
- **Health check**: http://localhost:3001/api/v1/health

---

## Comandos disponibles

```bash
# Desarrollo
npm run dev              # Inicia backend + frontend simultáneamente
npm run db:up            # Levanta PostgreSQL en Docker (puerto 5433)
npm run db:down          # Detiene PostgreSQL
npm run db:migrate       # Aplica migraciones de Prisma
npm run db:studio        # Abre Prisma Studio (explorador visual de BD)

# Solo backend
cd backend
npm run dev              # Servidor Express en :3001 con hot reload
npx tsx prisma/seed.ts   # Carga usuarios iniciales

# Solo frontend
cd frontend
npm run dev              # Vite en :5173 con proxy a :3001
npm run build            # Compilar para producción
```

---

## Estructura del proyecto

```
PROSEGUIT/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos completo
│   │   ├── migrations/            # Historial de migraciones
│   │   └── seed.ts                # Datos iniciales
│   ├── src/
│   │   ├── modules/               # Módulos por dominio
│   │   │   ├── auth/              # Login, refresh, logout
│   │   │   ├── equipment/         # CRUD equipos + tipos
│   │   │   ├── locations/         # Ciudad > Sección > Oficina
│   │   │   ├── history/           # Historial de movimientos
│   │   │   ├── loans/             # Préstamos y devoluciones
│   │   │   ├── model-templates/   # Plantillas de modelos
│   │   │   ├── service-providers/ # Servicios externos
│   │   │   ├── users/             # Gestión de usuarios
│   │   │   └── dashboard/         # Estadísticas
│   │   ├── middleware/            # Auth, validación, errores
│   │   ├── config/                # Env, CORS
│   │   └── utils/                 # Prisma client, paginación
│   └── prisma.config.ts           # Config Prisma 7 (datasource URL)
│
├── frontend/
│   └── src/
│       ├── pages/                 # Una página por ruta
│       ├── components/layout/     # MainLayout, Sidebar, Header
│       ├── hooks/                 # useEquipment, useLoans, usePageTitle, etc.
│       ├── lib/                   # api-client (fetch+JWT), auth-context, equipment-status
│       └── styles/                # variables.css, reset.css, globals.css
│
├── docker-compose.yml             # PostgreSQL 17 en puerto 5433
└── .env.example                   # Variables de entorno de referencia
```

---

## API REST

Base URL: `http://localhost:3001/api/v1`

| Módulo | Endpoints |
|--------|-----------|
| **Auth** | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` |
| **Equipos** | `GET/POST /equipment` · `GET/PUT /equipment/:id` · `GET /equipment/types` · acciones: transfer, send-to-support, send-to-service, decommission, return-from-service |
| **Ubicaciones** | `GET /locations/tree` · `POST /locations/cities\|sections\|offices` |
| **Historial** | `GET /history` · `GET /history/equipment/:id` |
| **Préstamos** | `GET/POST /loans` · `POST /loans/:id/return` |
| **Plantillas** | `GET/POST /model-templates` · `PUT/DELETE /model-templates/:id` |
| **Servicios** | `GET/POST /service-providers` · `PUT /service-providers/:id` |
| **Usuarios** | `GET/POST /users` · `PUT /users/:id` · `POST /users/:id/reset-password` |
| **Dashboard** | `GET /dashboard/stats` · `GET /dashboard/activity` |

Todos los endpoints (excepto `/auth/login` y `/health`) requieren `Authorization: Bearer <token>`.

---

## Funcionalidades

- **Inventario completo** — búsqueda debounced, filtros en cascada (ciudad→sección→oficina), columnas ordenables, paginación con selector de cantidad
- **Estado derivado por ubicación** — equipos en oficinas "soporte" o "depósito" muestran estado correspondiente automáticamente
- **Historial de auditoría** — toda acción queda registrada con motivo obligatorio, técnico y ubicaciones origen/destino
- **Ubicaciones jerárquicas** — Ciudad → Sección → Oficina, con panel de equipos por oficina
- **Acciones de equipo** — transferir, enviar a soporte, enviar a servicio externo, dar de baja, retornar de servicio
- **Préstamos** — registro de salida y devolución con identificación del funcionario
- **Plantillas de modelo** — especificaciones técnicas reutilizables (JSON)
- **Servicios externos** — seguimiento de envíos a reparación con proveedor y diagnóstico
- **Gestión de usuarios** — roles ADMIN/TECNICO, reset de contraseña

---

## Contribuir

1. Verificar que tu rama está actualizada antes de hacer push (el hook pre-push lo hace automáticamente)
2. Seguir las convenciones del proyecto:
   - CSS: Módulos CSS con nesting nativo, sin Tailwind
   - React 19: usar `use()` en lugar de `useContext()`
   - Prisma 7: siempre usar el adapter `@prisma/adapter-pg`
   - Express 5: manejo de errores async nativo
3. Commit messages en inglés siguiendo `feat:`, `fix:`, `chore:`

---

## Datos de desarrollo

> ⚠️ Solo para entorno local. No usar en producción.

| Usuario | Ficha | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | `9999` | `admin123` | ADMIN |
| Ramiro Quesada | `7844` | `7844` | TECNICO |

La contraseña del técnico puede cambiarse desde el menú de usuario.

---

*Intendencia Departamental de Soriano — Departamento de Informática*
