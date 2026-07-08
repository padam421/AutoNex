$files = Get-ChildItem -Path "backend\src", "frontend\src", "backend\tests" -Recurse -Include *.js,*.html,*.css
foreach ($file in $files) {
    Clear-Content $file.FullName
}
if (Test-Path "backend\server.js") { Clear-Content "backend\server.js" }
Write-Host "All application files cleared successfully."
