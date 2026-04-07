#!/bin/bash

# PROSEGUIT Setup Script
# Ejecuta: bash setup.sh

set -e

echo "🚀 PROSEGUIT v2 - Setup"
echo "======================="
echo ""

# 1. Crear .env si no existe
if [ ! -f .env ]; then
  echo "📋 Creando .env desde .env.example..."
  cp .env.example .env
  echo "   ✅ .env creado"
else
  echo "   ℹ️  .env ya existe"
fi

# 2. Crear .env en backend si no existe
if [ ! -f backend/.env ]; then
  echo "📋 Creando backend/.env..."
  cp .env backend/.env
  echo "   ✅ backend/.env creado"
else
  echo "   ℹ️  backend/.env ya existe"
fi

# 3. npm install
echo ""
echo "📦 Instalando dependencias..."
npm install
echo "   ✅ Dependencias instaladas"

# 4. Levantar DB
echo ""
echo "🐘 Levantando PostgreSQL..."
npm run db:up
echo "   ⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# 5. Migraciones
echo ""
echo "🔄 Aplicando migraciones..."
npm run db:migrate
echo "   ✅ Migraciones aplicadas"

# 6. Seed
echo ""
echo "🌱 Cargando usuarios iniciales..."
npm run db:seed
echo "   ✅ Base de datos lista"

echo ""
echo "✅ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "  npm run dev              # Iniciar backend + frontend"
echo ""
echo "Con datos de seguit v1:"
echo "  1. Copiar db_seguit1.sql a la raíz"
echo "  2. npm run migrate:v1"
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3001"
echo ""
echo "Credenciales:"
echo "  Admin:     9999 / admin123"
echo "  Técnico:   7844 / 7844"
