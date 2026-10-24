$ErrorActionPreference = 'Stop'
$coordRoot = Split-Path -Parent $PSScriptRoot
$coordRuntimePath = Join-Path $coordRoot '.coordination\runtime.json'
if (-not (Test-Path -LiteralPath $coordRuntimePath)) { Write-Output 'No recorded mailbox processes.'; exit 0 }
$coordRecord = Get-Content -LiteralPath $coordRuntimePath -Raw | ConvertFrom-Json
if ([IO.Path]::GetFullPath($coordRecord.repo_root) -ne [IO.Path]::GetFullPath($coordRoot)) { throw 'Runtime record belongs to another workspace.' }
foreach ($coordRole in @('tunnel','server')) {
    $coordProcessId = $coordRecord.($coordRole + '_pid')
    if (-not $coordProcessId) { continue }
    $coordProcess = Get-Process -Id $coordProcessId -ErrorAction SilentlyContinue
    if (-not $coordProcess) { continue }
    $coordExpectedPath = if ($coordRole -eq 'server') { Join-Path $coordRoot '.venv\Scripts\python.exe' } else { Join-Path $coordRoot '.coordination\bin\cloudflared.exe' }
    if ($coordProcess.Path -ne $coordExpectedPath -or $coordProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $coordRecord.($coordRole + '_start_ticks')) { throw "Refusing to stop a reused or unexpected $coordRole process." }
    Stop-Process -Id $coordProcessId
}
Write-Output 'Recorded mailbox and tunnel processes stopped. Stored messages remain in .coordination/.'
