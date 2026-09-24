$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$postgresBin = "C:\Program Files\PostgreSQL\17\bin\postgres.exe"
$dataDir = Join-Path $projectRoot ".postgres-data"

if (-not (Test-Path $postgresBin)) {
  throw "PostgreSQL 17 nao encontrado em $postgresBin"
}

if (-not (Test-Path $dataDir)) {
  & "C:\Program Files\PostgreSQL\17\bin\initdb.exe" -D $dataDir -U bichopet --auth=trust --encoding=UTF8 --locale=C
}

Write-Host "PostgreSQL local do Bicho Pet em 127.0.0.1:5434"
Write-Host "Mantenha esta janela aberta enquanto usar o ERP."
& $postgresBin -D $dataDir -p 5434
