param([ValidateSet('github','local')][string]$ContextSource = 'github')
$ErrorActionPreference = 'Stop'
$coordRoot = Split-Path -Parent $PSScriptRoot
$coordState = Join-Path $coordRoot '.coordination'
$coordPython = Join-Path $coordRoot '.venv\Scripts\python.exe'
$coordTunnel = Join-Path $coordState 'bin\cloudflared.exe'
$coordRuntimePath = Join-Path $coordState 'runtime.json'
if (-not (Test-Path -LiteralPath $coordPython)) { throw 'Create the virtual environment and install coordination/requirements.txt first.' }
if (-not (Test-Path -LiteralPath $coordTunnel)) { throw 'Install the official cloudflared.exe into .coordination/bin/ first; see coordination/README.md.' }
if (Test-Path -LiteralPath $coordRuntimePath) {
    $coordPrevious = Get-Content -LiteralPath $coordRuntimePath -Raw | ConvertFrom-Json
    $coordExisting = Get-Process -Id $coordPrevious.server_pid -ErrorAction SilentlyContinue
    if ($coordExisting -and $coordExisting.StartTime.ToUniversalTime().Ticks.ToString() -eq $coordPrevious.server_start_ticks) {
        Write-Output "Mailbox already running. Public endpoint: $($coordPrevious.public_url)/mcp"
        exit 0
    }
}
Push-Location -LiteralPath $coordRoot
try {
    & $coordPython -m coordination.setup
    if ($LASTEXITCODE -ne 0) { throw 'Credential setup failed.' }
    $coordServerProcess = Start-Process -FilePath $coordPython -ArgumentList @('-m','coordination.server','--context-source',$ContextSource) -WorkingDirectory $coordRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $coordState 'server.stdout.log') -RedirectStandardError (Join-Path $coordState 'server.stderr.log')
    $coordRecord = @{server_pid=$coordServerProcess.Id; server_start_ticks=$coordServerProcess.StartTime.ToUniversalTime().Ticks.ToString(); repo_root=$coordRoot; context_source=$ContextSource; public_url=''}
    $coordRecord | ConvertTo-Json | Set-Content -LiteralPath $coordRuntimePath -Encoding utf8
    $coordReady = $false
    for ($coordAttempt=0; $coordAttempt -lt 40; $coordAttempt++) {
        try { $coordHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 1; $coordReady = $coordHealth.status -eq 'running'; if ($coordReady) { break } } catch {}
        if ($coordServerProcess.HasExited) { throw 'Mailbox server exited; inspect .coordination/server.stderr.log.' }
        Start-Sleep -Milliseconds 250
    }
    if (-not $coordReady) { throw 'Mailbox server did not become ready.' }
    $coordTunnelProcess = Start-Process -FilePath $coordTunnel -ArgumentList @('tunnel','--no-autoupdate','--url','http://127.0.0.1:8765','--http-host-header','127.0.0.1:8765','--protocol','http2') -WorkingDirectory $coordRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $coordState 'tunnel.stdout.log') -RedirectStandardError (Join-Path $coordState 'tunnel.stderr.log')
    $coordRecord.tunnel_pid = $coordTunnelProcess.Id
    $coordRecord.tunnel_start_ticks = $coordTunnelProcess.StartTime.ToUniversalTime().Ticks.ToString()
    $coordRecord | ConvertTo-Json | Set-Content -LiteralPath $coordRuntimePath -Encoding utf8
    for ($coordAttempt=0; $coordAttempt -lt 100; $coordAttempt++) {
        $coordLog = Get-Content -LiteralPath (Join-Path $coordState 'tunnel.stderr.log') -Raw -ErrorAction SilentlyContinue
        $coordMatch = [regex]::Match([string]$coordLog, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($coordMatch.Success) { $coordRecord.public_url = $coordMatch.Value; break }
        if ($coordTunnelProcess.HasExited) { throw 'Tunnel exited; inspect .coordination/tunnel.stderr.log.' }
        Start-Sleep -Milliseconds 250
    }
    if (-not $coordRecord.public_url) { throw 'Tunnel address not received; inspect the tunnel log.' }
    $coordRecord | ConvertTo-Json | Set-Content -LiteralPath $coordRuntimePath -Encoding utf8
    & $coordPython -m coordination.setup --public-url $coordRecord.public_url
    Write-Output "Mailbox running: $($coordRecord.public_url)/mcp"
    Write-Output 'Private connector headers: .coordination/CONNECTIONS.private.md'
} finally { Pop-Location }
