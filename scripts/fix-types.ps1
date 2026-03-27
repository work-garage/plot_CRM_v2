# PowerShell script to fix type safety issues across codebase

$files = @(
    "app\actions\enquiries.ts",
    "app\actions\emi.ts",
    "app\actions\self-profile.ts",
    "app\actions\settings.ts",
    "app\actions\commissions.ts",
    "app\actions\payments.ts",
    "app\actions\customer-documents.ts",
    "app\actions\messaging-directory.ts",
    "app\actions\project-actions.ts",
    "app\actions\receipts.ts",
    "app\actions\reminders.ts",
    "app\actions\plots.ts",
    "app\actions\reports.ts",
    "components\payments\payment-form.tsx",
    "components\projects\project-form.tsx"
)

$replacements = @{
    "getScopeContext\(supabase as any\)" = "getScopeContext(supabase)"
    "zodResolver\((.*?)\) as any" = "zodResolver(`$1)"
    "\(row: any\)" = "(row)"
    "\(p: any\)" = "(p)"
}

$totalFixes = 0

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot "..\$file"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    $fileFixed = 0
    
    foreach ($pattern in $replacements.Keys) {
        $replacement = $replacements[$pattern]
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern, $replacement
            $fileFixed += $matches.Count
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "✓ Fixed $fileFixed occurrence(s) in $file" -ForegroundColor Green
        $totalFixes += $fileFixed
    }
}

Write-Host "`n✅ Total fixes applied: $totalFixes" -ForegroundColor Cyan
Write-Host "Please run 'npm run build' to verify the changes." -ForegroundColor Cyan
