param(
  [string]$Version = "2.1.0"
)

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "dist-package"
$staging = Join-Path $outDir "shiro-notes-v$Version"
$zipPath = Join-Path $outDir "shiro-notes-v$Version.zip"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

New-Item -ItemType Directory -Force $staging | Out-Null

$items = @(
  "index.html",
  "manifest.webmanifest",
  "offline.html",
  "sw.js",
  "pwa.css",
  "pwa.js",
  "*.css",
  "*.js",
  "dist",
  "dist-ts",
  "icons",
  "README.md",
  "QUICK_START.md"
)

foreach ($item in $items) {
  Get-ChildItem -Path (Join-Path $root $item) -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $staging -Recurse -Force
  }
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
Write-Host "Package created: $zipPath"
