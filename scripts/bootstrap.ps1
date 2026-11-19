# BangMotion Visual Director — Node.js 준비 (Windows)
# 관리자 권한·앱 재시작 없이 동작한다.
#  1) PATH에 Node.js 18 이상이 있으면 그대로 쓴다.
#  2) 없으면 nodejs.org 공식 휴대용 zip(최신 LTS)을 사용자 폴더
#     %LOCALAPPDATA%\bangmotion-visual-director\node 에 내려받아 체크섬을 확인하고 푼다(설치 마법사 없음).
#  3) scripts\node_modules 가 없으면 그 Node의 npm으로 playwright-core·esbuild를 설치한다.
#  마지막 줄에 NODE=<node.exe 전체 경로> 를 출력한다. 에이전트는 이후 모든 node 명령에 이 경로를 쓴다.
# 실행: powershell -NoProfile -ExecutionPolicy Bypass -File "<스킬>\scripts\bootstrap.ps1" [-Portable]
#  -Portable : PATH의 Node를 무시하고 휴대용 Node를 쓴다(시험용).
param([switch]$Portable)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$scripts = $PSScriptRoot
$shared = Join-Path $env:LOCALAPPDATA 'bangmotion-visual-director'
$nodeDir = Join-Path $shared 'node'
$portableExe = Join-Path $nodeDir 'node.exe'

function Get-NodeMajor([string]$exe) {
  try { $v = & $exe -v 2>$null; if ($v -match '^v(\d+)\.') { return [int]$Matches[1] } } catch {}
  return 0
}

$node = $null
if (-not $Portable) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and (Get-NodeMajor $cmd.Source) -ge 18) { $node = $cmd.Source }
}
if (-not $node -and (Test-Path $portableExe) -and (Get-NodeMajor $portableExe) -ge 18) { $node = $portableExe }

if (-not $node) {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  Write-Host "[준비] Node.js(LTS, win-$arch)를 내려받습니다. 약 30MB, 관리자 권한은 필요 없습니다..."
  $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
  $lts = $index | Where-Object { $_.lts -and ($_.files -contains "win-$arch-zip") } | Select-Object -First 1
  if (-not $lts) { throw 'nodejs.org에서 LTS 버전 정보를 찾지 못했습니다.' }
  $ver = $lts.version
  $name = "node-$ver-win-$arch"
  $base = "https://nodejs.org/dist/$ver"
  $tmp = Join-Path $env:TEMP "bmvd-$name"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp "$name.zip"
  Invoke-WebRequest -Uri "$base/$name.zip" -OutFile $zip -UseBasicParsing
  $sums = (Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -UseBasicParsing).Content
  if ($sums -is [byte[]]) { $sums = [Text.Encoding]::ASCII.GetString($sums) }
  $line = ($sums -split "`r?`n") | Where-Object { $_ -match ('\s' + [regex]::Escape("$name.zip") + '$') } | Select-Object -First 1
  $expected = if ($line) { ($line -split '\s+')[0].ToLower() } else { '' }
  $actual = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLower()
  if (-not $expected -or $expected -ne $actual) { throw "내려받은 Node.js 파일의 체크섬이 맞지 않습니다. 다시 실행해 주세요." }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force -Path $shared | Out-Null
  if (Test-Path $nodeDir) { Remove-Item -Path $nodeDir -Recurse -Force }
  Move-Item -Path (Join-Path $tmp $name) -Destination $nodeDir
  Remove-Item -Path $tmp -Recurse -Force
  $node = $portableExe
  Write-Host "[준비] Node.js $ver 준비 완료"
}

# 이 PowerShell 창 안에서만 경로를 앞에 붙인다(시스템 설정은 바꾸지 않는다).
$env:Path = (Split-Path $node) + ';' + $env:Path
$missing = -not (Test-Path (Join-Path $scripts 'node_modules\playwright-core')) -or -not (Test-Path (Join-Path $scripts 'node_modules\esbuild'))
if ($missing) {
  Write-Host '[준비] 필요한 패키지(playwright-core, esbuild)를 설치합니다...'
  $npmCli = Join-Path (Split-Path $node) 'node_modules\npm\bin\npm-cli.js'
  Push-Location $scripts
  try {
    if (Test-Path $npmCli) { & $node $npmCli install --no-fund --no-audit --silent } else { npm install --no-fund --no-audit --silent }
    if ($LASTEXITCODE -ne 0) { throw "npm install 실패 (종료 코드 $LASTEXITCODE)" }
  } finally { Pop-Location }
}
Write-Output "NODE=$node"
