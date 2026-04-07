# PROSEGUIT Setup Script for Windows PowerShell
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host "🚀 PROSEGUIT v2 - Setup" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""

# 1. Crear .env si no existe
if (!(Test-Path .env)) {
  Write-Host "📋 Creando .env desde .env.example..." -ForegroundColor Cyan
  Copy-Item .env.example .env
  Write-Host "   ✅ .env creado" -ForegroundColor Green
} else {
  Write-Host "   ℹ️  .env ya existe" -ForegroundColor Yellow
}

# 2. Crear .env en backend si no existe
if (!(Test-Path backend\.env)) {
  Write-Host "📋 Creando backend/.env..." -ForegroundColor Cyan
  Copy-Item .env backend\.env
  Write-Host "   ✅ backend/.env creado" -ForegroundColor Green
} else {
  Write-Host "   ℹ️  backend/.env ya existe" -ForegroundColor Yellow
}

# 3. npm install
Write-Host ""
Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
npm install
Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green

# 4. Levantar DB
Write-Host ""
Write-Host "🐘 Levantando PostgreSQL..." -ForegroundColor Cyan
npm run db:up
Write-Host "   ⏳ Esperando a que PostgreSQL esté listo..."
Start-Sleep -Seconds 5

# 5. Migraciones
Write-Host ""
Write-Host "🔄 Aplicando migraciones..." -ForegroundColor Cyan
npm run db:migrate
Write-Host "   ✅ Migraciones aplicadas" -ForegroundColor Green

# 6. Seed
Write-Host ""
Write-Host "🌱 Cargando usuarios iniciales..." -ForegroundColor Cyan
npm run db:seed
Write-Host "   ✅ Base de datos lista" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Setup completado!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "  npm run dev              # Iniciar backend + frontend"
Write-Host ""
Write-Host "Con datos de seguit v1:" -ForegroundColor Cyan
Write-Host "  1. Copiar db_seguit1.sql a la raíz"
Write-Host "  2. npm run migrate:v1"
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:5173"
Write-Host "  Backend:   http://localhost:3001"
Write-Host ""
Write-Host "Credenciales:" -ForegroundColor Cyan
Write-Host "  Admin:     9999 / admin123"
Write-Host "  Técnico:   7844 / 7844"
