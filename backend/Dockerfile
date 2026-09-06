# ── PROSEGUIT — Backend ───────────────────────────────────────────────────────
# Compila el paquete compartido y la API. Producción ejecuta únicamente
# JavaScript generado, sin depender de tsx ni del código TypeScript fuente.

FROM node:22-alpine

WORKDIR /app

# Instalar dependencias del workspace (monorepo)
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package*.json ./backend/

RUN npm ci

# Copiar código fuente
COPY packages/shared ./packages/shared
COPY backend ./backend

# Generar Prisma Client y compilar shared + backend
RUN cd backend && npx prisma generate \
    && cd /app \
    && npm run build:shared \
    && npm run build --workspace=backend

WORKDIR /app/backend

EXPOSE 3001

# Aplica migraciones pendientes y arranca el servidor compilado
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
