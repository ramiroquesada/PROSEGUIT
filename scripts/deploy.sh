#!/usr/bin/env bash
# Despliegue repetible de PROSEGUIT con Docker Compose.
#
# Uso normal en el VPS:
#   ./scripts/deploy.sh
#
# El script hace backup de PostgreSQL y uploads antes de actualizar. Para una
# instalación inicial (sin servicios ni datos previos), usar exclusivamente:
#   ./scripts/deploy.sh --first-deploy

set -Eeuo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
readonly ENV_FILE="${ENV_FILE:-.env.production}"
readonly BRANCH="main"
readonly BACKUPS_ROOT="${BACKUPS_ROOT:-$REPO_ROOT/backups}"

first_deploy=false

usage() {
  cat <<'EOF'
Uso: ./scripts/deploy.sh [--first-deploy]

Actualiza únicamente la rama main, respalda PostgreSQL y uploads, reconstruye
Docker Compose y comprueba /api/v1/health.

--first-deploy  Permite continuar sin backup únicamente si postgres y backend
                 todavía no existen. No usar en un servidor con datos.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Falta el comando requerido: $1"
}

while (($#)); do
  case "$1" in
    --first-deploy) first_deploy=true ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Opción desconocida: $1" ;;
  esac
  shift
done

require_command git
require_command docker
require_command curl

cd "$REPO_ROOT"

[[ -f "$COMPOSE_FILE" ]] || fail "No existe $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "No existe $ENV_FILE. Crear a partir de .env.production.example"
[[ -z "$(git status --porcelain)" ]] || fail "El árbol de trabajo tiene cambios locales. Resolverlos antes de desplegar."

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "==> Validando configuración de Docker Compose"
"${compose[@]}" config -q

echo "==> Actualizando $BRANCH"
git fetch origin "$BRANCH"
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

[[ -z "$(git status --porcelain)" ]] || fail "La actualización dejó cambios locales inesperados."

commit="$(git rev-parse --short HEAD)"
version="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json | head -n 1)"
[[ -n "$version" ]] || fail "No se pudo determinar la versión desde package.json"
backend_version="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' backend/package.json | head -n 1)"
frontend_version="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' frontend/package.json | head -n 1)"
[[ "$version" == "$backend_version" && "$version" == "$frontend_version" ]] || fail "Las versiones de root, backend y frontend no coinciden"

postgres_id="$("${compose[@]}" ps -q postgres)"
backend_id="$("${compose[@]}" ps -q backend)"

if [[ -z "$postgres_id" || -z "$backend_id" ]]; then
  if ! $first_deploy; then
    fail "No se encontraron servicios previos para respaldar. Si es una instalación vacía, usar --first-deploy."
  fi
  echo "==> Instalación inicial confirmada: no hay datos previos que respaldar"
else
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="$BACKUPS_ROOT/$timestamp-$commit"
  umask 077
  mkdir -p "$backup_dir"

  echo "==> Respaldando PostgreSQL en $backup_dir/postgres.dump"
  "${compose[@]}" exec -T postgres pg_dump -U proseguit -Fc --no-owner --no-privileges proseguit > "$backup_dir/postgres.dump"
  [[ -s "$backup_dir/postgres.dump" ]] || fail "El backup de PostgreSQL quedó vacío. Se cancela el despliegue."

  echo "==> Respaldando uploads en $backup_dir/uploads.tar.gz"
  "${compose[@]}" exec -T backend sh -c 'tar -C /app/backend/uploads -czf - .' > "$backup_dir/uploads.tar.gz"
  [[ -s "$backup_dir/uploads.tar.gz" ]] || fail "El backup de uploads quedó vacío. Se cancela el despliegue."
  echo "==> Backup creado y verificado: $backup_dir"
fi

echo "==> Construyendo y levantando servicios (commit $commit, versión $version)"
"${compose[@]}" up -d --build

http_port="$(sed -nE 's/^[[:space:]]*HTTP_PORT[[:space:]]*=[[:space:]]*([0-9]+).*/\1/p' "$ENV_FILE" | tail -n 1)"
http_port="${http_port:-80}"
health_url="${HEALTH_URL:-http://127.0.0.1:$http_port/api/v1/health}"

echo "==> Esperando health check: $health_url"
health_response=''
for _attempt in {1..15}; do
  if health_response="$(curl --fail --silent --show-error --max-time 5 "$health_url")"; then
    break
  fi
  sleep 2
done

[[ -n "$health_response" ]] || fail "El health check no respondió correctamente. Revisar: ${compose[*]} logs --tail=200"
grep -q '"status":"ok"' <<< "$health_response" || fail "Health check sin estado OK: $health_response"
grep -q "\"version\":\"$version\"" <<< "$health_response" || fail "La versión del health check no coincide con $version: $health_response"

echo "==> Despliegue correcto"
echo "    commit:  $commit"
echo "    versión: $version"
echo "    health:  $health_response"
echo
echo "Pendiente de validación manual: login y apertura de un equipo. No generar ENTRADAS, SALIDAS ni otros movimientos reales durante el smoke test."
