$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Установите Node.js 24 и повторите запуск.' }
}
$localDir = Join-Path $PSScriptRoot '.local'
New-Item -ItemType Directory -Force -Path $localDir | Out-Null
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
$pgData = Join-Path $localDir 'postgres'
if ((Test-Path -LiteralPath $pgCtl) -and (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    & $pgCtl -D $pgData status *> $null
    if ($LASTEXITCODE -ne 0) {
        & $pgCtl -D $pgData -l (Join-Path $localDir 'postgres.log') -o '-p 55439 -h 127.0.0.1' start
        if ($LASTEXITCODE -ne 0) { throw 'Не удалось запустить PostgreSQL проекта.' }
    }
}
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Порт 3000 уже занят. Если сайт запущен, откройте http://localhost:3000'
    exit 0
}
if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) { throw 'Сначала выполните pnpm run build (см. README.md).' }
$webCli = Join-Path $PSScriptRoot 'node_modules/next/dist/bin/next'
$tsxCli = Join-Path $PSScriptRoot 'node_modules/tsx/dist/cli.mjs'
$workerFile = Join-Path $PSScriptRoot 'src/worker.ts'
$web = Start-Process -FilePath $nodePath -ArgumentList @('--env-file=.env', ('"' + $webCli + '"'), 'start', '--hostname', '127.0.0.1') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'web.log') -RedirectStandardError (Join-Path $localDir 'web-error.log')
$worker = Start-Process -FilePath $nodePath -ArgumentList @('--env-file=.env', ('"' + $tsxCli + '"'), ('"' + $workerFile + '"')) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'worker.log') -RedirectStandardError (Join-Path $localDir 'worker-error.log')
@{ web = $web.Id; worker = $worker.Id; workspace = $PSScriptRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localDir 'services.json')
Write-Host 'Соседи запускается: http://localhost:3000'
Write-Host 'Журналы находятся в папке .local.'
