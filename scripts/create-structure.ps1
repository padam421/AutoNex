# ============================================================
# AI Powered Railway Dynamic Scheduling & Delay Management System
# Project Structure Generator Script
# ============================================================

$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ROOT) { $ROOT = "c:\Users\Padam Kishore\Documents\SIH\railway-dashboard" }

Write-Host "Creating project structure at: $ROOT" -ForegroundColor Cyan

# ============================================================
# CREATE ALL DIRECTORIES
# ============================================================

$directories = @(
    # Root config
    ".github\workflows",
    ".vscode",

    # Backend
    "backend\src\config",
    "backend\src\controllers",
    "backend\src\middleware",
    "backend\src\models",
    "backend\src\routes",
    "backend\src\services",
    "backend\src\services\ai",
    "backend\src\utils",
    "backend\tests\unit",
    "backend\tests\integration",

    # Frontend - Pages
    "frontend\public",
    "frontend\src\pages",
    
    # Frontend - CSS
    "frontend\src\css\components",
    "frontend\src\css\pages",
    "frontend\src\css\base",
    
    # Frontend - JavaScript
    "frontend\src\js\core",
    "frontend\src\js\components",
    "frontend\src\js\pages",
    "frontend\src\js\services",
    "frontend\src\js\utils",
    "frontend\src\js\simulation",
    
    # Frontend - Assets
    "frontend\src\assets\images\logo",
    "frontend\src\assets\images\backgrounds",
    "frontend\src\assets\images\icons",
    "frontend\src\assets\images\icons\sidebar",
    "frontend\src\assets\images\icons\status",
    "frontend\src\assets\images\icons\weather",
    "frontend\src\assets\images\trains",
    "frontend\src\assets\images\maps",
    "frontend\src\assets\images\avatars",
    "frontend\src\assets\fonts",
    "frontend\src\assets\videos",
    
    # Data
    "data\mock",
    "data\seed",
    "data\schemas",
    "data\geojson",

    # Docs
    "docs\screenshots",
    "docs\api",
    "docs\guides",

    # Scripts
    "scripts"
)

foreach ($dir in $directories) {
    $path = Join-Path $ROOT $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  [DIR]  $dir" -ForegroundColor DarkGreen
    }
}

Write-Host "`nDirectories created successfully!" -ForegroundColor Green
Write-Host "Total directories: $($directories.Count)" -ForegroundColor Yellow
Write-Host "`nProject structure generation complete!" -ForegroundColor Cyan
