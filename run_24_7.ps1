# UpStore 24/7 Indestructible Promoter PowerShell Runner
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   UpStore 24/7 Autonomous Promotion Engine - PowerShell Daemon" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

while ($true) {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$now] Starting Promoter Server..." -ForegroundColor Green
    python -u scripts/smart_telegram_promoter.py
    $exitCode = $LASTEXITCODE
    Write-Host "[$now] Notice: Process exited (Code: $exitCode). Auto-restarting in 3 seconds..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
