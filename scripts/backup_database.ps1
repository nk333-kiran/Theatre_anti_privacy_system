# ==============================================================================
# Theatre Anti-Piracy Platform — PostgreSQL Backup Automation Script (PowerShell)
# ==============================================================================

param (
    [string]$DbName = "theatre_antipiracy_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$BackupDir = "./backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$BackupDir/${DbName}_backup_${Timestamp}.sql"

if (!(Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "📦 Starting PostgreSQL database backup for '$DbName'..." -ForegroundColor Cyan

# Execute pg_dump
try {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f "$BackupPath.dump"
    Write-Host "✅ Database backup created successfully: $BackupPath.dump" -ForegroundColor Green
} catch {
    Write-Host "❌ Database backup failed: $_" -ForegroundColor Red
}
