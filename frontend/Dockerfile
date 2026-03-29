# ── PROSEGUIT — Frontend ──────────────────────────────────────────────────────
# Stage 1: compilar con Vite
# Stage 2: servir con nginx (incluye proxy /api → backend)

FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias del workspace
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package*.json ./frontend/

RUN npm ci

# Copiar código fuente
COPY packages/shared ./packages/shared
COPY frontend ./frontend

# Build de producción (tsc + vite build)
RUN npm run build --workspace=frontend

# ── Stage 2: nginx ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
