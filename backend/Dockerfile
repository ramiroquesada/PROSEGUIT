# ── PROSEGUIT — Backend ───────────────────────────────────────────────────────
# Usa tsx para correr TypeScript directamente, evitando problemas de resolución
# de módulos con @proseguit/shared (que apunta a fuente .ts, no a dist/).

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

# Generar Prisma client
RUN cd backend && npx prisma generate

WORKDIR /app/backend

EXPOSE 3001

# Aplica migraciones pendientes y arranca el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
