# Node.js 服务器启动脚本
Write-Host "正在启动 Promote App Node.js 服务器..." -ForegroundColor Green

# 检查是否安装了 Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# 检查是否安装了依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "正在安装依赖..." -ForegroundColor Yellow
    npm install
}

# 启动服务器
Write-Host "启动服务器..." -ForegroundColor Green
Write-Host "服务器地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Red

npm start
