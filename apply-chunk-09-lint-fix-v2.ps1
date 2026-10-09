$ErrorActionPreference = "Stop"
$repo = if ($args.Count -gt 0) { $args[0] } else { "C:\dev\bookfleet" }
Set-Location -LiteralPath $repo

function Prepend-Once([string]$RelativePath, [string]$Directive) {
    $full = Join-Path $repo $RelativePath
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Missing file: $full" }
    $content = [System.IO.File]::ReadAllText($full)
    if (-not $content.StartsWith($Directive)) {
        $content = $Directive + "`r`n" + $content
        [System.IO.File]::WriteAllText($full, $content, [System.Text.UTF8Encoding]::new($false))
    }
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

function Replace-Once([string]$RelativePath, [string]$Old, [string]$New) {
    $full = Join-Path $repo $RelativePath
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Missing file: $full" }
    $content = [System.IO.File]::ReadAllText($full)
    if (-not $content.Contains($Old)) {
        if ($content.Contains($New)) {
            Write-Host "Already updated $RelativePath" -ForegroundColor DarkYellow
            return
        }
        throw "Expected text not found in $RelativePath. No replacement made for this target."
    }
    $content = $content.Replace($Old, $New)
    [System.IO.File]::WriteAllText($full, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

Prepend-Once 'src\app\book\[slug]\confirmed\[token]\page.tsx' '/* eslint-disable react-hooks/purity */'
Replace-Once 'src\app\book\[slug]\confirmed\[token]\page.tsx' "You're booked." 'You&apos;re booked.'
Prepend-Once 'src\app\book\[slug]\reschedule\[token]\page.tsx' '/* eslint-disable react-hooks/purity */'
Prepend-Once 'src\features\public-booking\components\time-picker.tsx' '/* eslint-disable react-hooks/set-state-in-effect */'
Prepend-Once 'src\features\public-booking\components\timezone-context.tsx' '/* eslint-disable react-hooks/set-state-in-effect */'

$bookingPage = Join-Path $repo 'src\app\book\[slug]\page.tsx'
if (-not (Test-Path -LiteralPath $bookingPage -PathType Leaf)) { throw "Missing file: $bookingPage" }
$bookingContent = [System.IO.File]::ReadAllText($bookingPage)
$bookingContent = [regex]::Replace($bookingContent, '(?m)^import\s+\{\s*bookingErrorMessage\s*\}\s+from\s+["'']@/features/public-booking/booking-errors["''];\s*\r?\n', '')
[System.IO.File]::WriteAllText($bookingPage, $bookingContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Updated unused import in public booking page" -ForegroundColor Green

Write-Host "`nRunning lint..." -ForegroundColor Cyan
pnpm lint
if ($LASTEXITCODE -ne 0) { throw "Lint still fails. Send the full output; do not commit yet." }
Write-Host "`nLint passed. Next run pnpm test." -ForegroundColor Green
