$models = @('Train.js', 'User.js', 'Station.js', 'Conflict.js', 'Notification.js', 'Analytics.js', 'Weather.js')
$modelsPath = 'backend\src\models'
if (-not (Test-Path $modelsPath)) { New-Item -ItemType Directory -Force -Path $modelsPath | Out-Null }
foreach ($m in $models) {
    New-Item -ItemType File -Force -Path (Join-Path $modelsPath $m) | Out-Null
}

$configPath = 'backend\src\config'
if (-not (Test-Path $configPath)) { New-Item -ItemType Directory -Force -Path $configPath | Out-Null }
New-Item -ItemType File -Force -Path (Join-Path $configPath 'db.js') | Out-Null

$seedPath = 'backend\src\seeders'
if (-not (Test-Path $seedPath)) { New-Item -ItemType Directory -Force -Path $seedPath | Out-Null }
New-Item -ItemType File -Force -Path (Join-Path $seedPath 'seed.js') | Out-Null

Write-Host 'Database files added successfully.'
