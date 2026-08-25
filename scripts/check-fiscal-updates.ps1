$ErrorActionPreference = "Stop"

$schemaUrl = "https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w="
$notesUrl = "https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY="

try {
  $schemaPage = Invoke-WebRequest -UseBasicParsing -Uri $schemaUrl -MaximumRedirection 3 -TimeoutSec 25
  $notesPage = Invoke-WebRequest -UseBasicParsing -Uri $notesUrl -MaximumRedirection 3 -TimeoutSec 25
  $latestSchema = [regex]::Match($schemaPage.Content, "Pacote de Libera.{0,20}o 01[^<]{0,180}").Value
  $latestEvent = [regex]::Match($schemaPage.Content, "NT 2025\.002 v\.1\.[0-9]+ - RTC[^<]{0,100}").Value
  $nonCurrentIndex = $notesPage.Content.IndexOf("Documentos n.o vigentes", [System.StringComparison]::OrdinalIgnoreCase)
  $currentNotes = if ($nonCurrentIndex -gt 0) { $notesPage.Content.Substring(0, $nonCurrentIndex) } else { $notesPage.Content }
  $expected = @(
    ($latestSchema -match "010e_v\.1\.02"),
    ($latestEvent -match "v\.1\.40"),
    ($currentNotes -match "2025\.002 v\.1\.51"),
    ($currentNotes -match "2026\.002 v\.1\.10"),
    ($currentNotes -match "2026\.007 v\.1\.00")
  )
  if ($expected -contains $false) {
    Write-Error "ATUALIZACAO FISCAL DETECTADA. Revise os esquemas e as Notas Tecnicas oficiais antes de transmitir qualquer documento. Esquema encontrado: $latestSchema"
    exit 2
  }
  Write-Output "Versoes fiscais atuais confirmadas no portal oficial: PL 010e v1.02; eventos RTC v1.40; NT 2025.002 v1.51; NT 2026.002 v1.10; NT 2026.007 v1.00."
} catch {
  Write-Error "Nao foi possivel consultar o portal fiscal oficial: $($_.Exception.Message)"
  exit 1
}
