Write-Host "Iniciando Setup LojaCond..." -ForegroundColor Green

# 1. Limpeza
Write-Host "1. Removendo arquivos antigos..."
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }
if (Test-Path "vite.config.ts") { Remove-Item "vite.config.ts" -Force }

# 2. Instalação
Write-Host "2. Instalando dependências (Isso pode demorar)..."
npm install --force

# 3. Conclusão
Write-Host "Setup concluído com sucesso!" -ForegroundColor Green
Write-Host "Para iniciar, rode: npm run dev" -ForegroundColor Cyan
