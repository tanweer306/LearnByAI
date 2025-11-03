# Cleanup Script for Temporary Upload Files
# This script safely deletes temporary upload files that have been copied to page.tsx

Write-Host "🧹 Cleanup Script - Removing Temporary Upload Files" -ForegroundColor Cyan
Write-Host ""

$filesToDelete = @(
    "src\app\dashboard\books\upload\student-upload.tsx",
    "src\app\dashboard\teacher\books\upload\teacher-upload.tsx",
    "src\app\dashboard\institution\books\upload\institution-upload.tsx"
)

$deletedCount = 0
$notFoundCount = 0

foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "🗑️  Deleting: $file" -ForegroundColor Yellow
        Remove-Item $fullPath -Force
        $deletedCount++
        Write-Host "   ✅ Deleted successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Deleted: $deletedCount files" -ForegroundColor Green
Write-Host "   Not found: $notFoundCount files" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
