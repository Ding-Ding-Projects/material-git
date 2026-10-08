param([ValidateSet('build','installer','fetch')][string]$Action = 'build', [switch]$Silent, [switch]$Run)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$started = Get-Date
try {
  Write-Host 'Using a per-user toolchain; administrator access is not required.'
  $nodeOk = $false
  if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = (& node -p 'process.versions.node').Trim()
    $nodeOk = $LASTEXITCODE -eq 0 -and [version]$nodeVersion -ge [version]'22.12.0'
    if ($nodeOk -and -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { $nodeOk = $false }
    if ($nodeOk) { Write-Host "Using Node.js $nodeVersion" }
  }
  if (-not $nodeOk) {
    $version = '22.20.0'
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
    $expected = if ($arch -eq 'arm64') { 'b12919e609b4fa1176ba8a155b49f761419a0c7cc97b42e6be09874a3f760ab6' } else { 'bb819d6eb8f5bfda294bbc83a7e4ec6539da67c4233d54b0d655b9248b15e29d' }
    $cache = Join-Path $env:LOCALAPPDATA 'MaterialGit/toolchains'
    New-Item -ItemType Directory -Force $cache | Out-Null
    $archive = Join-Path $cache "node-v$version-win-$arch.zip"
    $source = "https://nodejs.org/dist/v$version/node-v$version-win-$arch.zip"
    if (-not (Test-Path $archive) -or (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
      Write-Host "Downloading Node.js $version from $source"
      $temp = "$archive.$([guid]::NewGuid()).download"
      [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $temp
      if ((Get-FileHash $temp -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { Remove-Item $temp; throw "Node.js $version SHA-256 mismatch from $source" }
      Move-Item -Force $temp $archive
    }
    # Re-extract the verified archive so tampered or interrupted extraction cannot be reused.
    $stage = Join-Path $cache ([guid]::NewGuid().ToString())
    Expand-Archive -Path $archive -DestinationPath $stage
    $env:PATH = (Join-Path $stage "node-v$version-win-$arch") + ';' + $env:PATH
    $actual = (& node -p 'process.versions.node').Trim()
    if ($actual -ne $version) { throw "Expected Node.js $version; found $actual after verified portable extraction" }
    Write-Host "Activated Node.js $actual from $stage"
  }
  & node scripts/fetch-dependencies.mjs
  if ($LASTEXITCODE -ne 0) { throw "Dependency fetch exited $LASTEXITCODE" }
  if ($Action -ne 'fetch') {
    & node scripts/build.mjs
    if ($LASTEXITCODE -ne 0) { throw "Application build exited $LASTEXITCODE" }
    if ($Action -eq 'installer') {
      & node scripts/package.mjs
      if ($LASTEXITCODE -ne 0) { throw "Squirrel.Windows packaging exited $LASTEXITCODE" }
    }
    Write-Host "Completed $Action in $([math]::Round(((Get-Date)-$started).TotalSeconds, 1)) seconds."
    if ($Action -eq 'build') {
      $launch = $Run
      if (-not $Silent -and -not $Run) { $launch = (Read-Host 'Run Material Git now? [y/N]') -match '^(y|yes)$' }
      if ($launch) {
        & node_modules/.bin/electron.cmd .
        if ($LASTEXITCODE -ne 0) { throw "Material Git exited $LASTEXITCODE" }
      }
    }
  }
  exit 0
} catch {
  Write-Error "Material Git $Action failed: $($_.Exception.Message)"
  exit 1
}
