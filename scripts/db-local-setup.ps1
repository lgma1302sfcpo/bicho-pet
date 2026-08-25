$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$createdb = "C:\Program Files\PostgreSQL\17\bin\createdb.exe"
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

if (-not (Test-Path $createdb)) {
  throw "createdb.exe nao encontrado. Verifique a instalacao do PostgreSQL 17."
}

Push-Location $projectRoot
try {
  & $createdb -h 127.0.0.1 -p 5433 -U erp erp_comercial 2>$null
  if ($LASTEXITCODE -ne 0) {
    & $psql -h 127.0.0.1 -p 5433 -U erp -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'erp_comercial';" | Select-String "1" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel criar ou localizar o banco erp_comercial."
    }
  }

  npm run prisma:migrate
  npm run db:seed
}
finally {
  Pop-Location
}
