$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$createdb = "C:\Program Files\PostgreSQL\17\bin\createdb.exe"
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

if (-not (Test-Path $createdb)) {
  throw "createdb.exe nao encontrado. Verifique a instalacao do PostgreSQL 17."
}

Push-Location $projectRoot
try {
  & $createdb -h 127.0.0.1 -p 5434 -U bichopet bichopet 2>$null
  if ($LASTEXITCODE -ne 0) {
    & $psql -h 127.0.0.1 -p 5434 -U bichopet -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'bichopet';" | Select-String "1" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel criar ou localizar o banco bichopet."
    }
  }

  npm run prisma:migrate
  npm run db:seed
}
finally {
  Pop-Location
}
