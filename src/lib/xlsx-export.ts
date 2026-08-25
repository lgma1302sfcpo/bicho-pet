import { strToU8, zipSync } from "fflate";

type CellValue = string | number | boolean | null | undefined;
export type SpreadsheetSheet = { name: string; rows: Array<Record<string, CellValue>> };

function escapeXml(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function safeSheetName(value: string, index: number) {
  return (value.replace(/[\\/*?:\[\]]/g, " ").trim() || `Planilha ${index + 1}`).slice(0, 31);
}

function worksheetXml(sheet: SpreadsheetSheet) {
  const headers = sheet.rows.length ? Object.keys(sheet.rows[0]) : [];
  const rows = [headers.reduce<Record<string, CellValue>>((result, header) => ({ ...result, [header]: header }), {}), ...sheet.rows];
  const moneyHeaders = new Set(["Custo", "Total", "Receita", "Lucro", "revenue", "cost", "profit"]);
  const rowXml = rows.map((row, rowIndex) => {
    const cells = headers.map((header, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      const value = row[header];
      if (rowIndex > 0 && typeof value === "number" && Number.isFinite(value)) return `<c r="${reference}"${moneyHeaders.has(header) ? ' s="2"' : ""}><v>${value}</v></c>`;
      if (rowIndex > 0 && typeof value === "boolean") return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
      return `<c r="${reference}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${escapeXml(value == null ? "" : String(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const lastColumn = headers.length ? columnName(headers.length - 1) : "A";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${Math.max(rows.length, 1)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${lastColumn}1"/></worksheet>`;
}

export function buildXlsx(sheets: SpreadsheetSheet[]) {
  if (!sheets.length) throw new Error("Adicione pelo menos uma planilha.");
  const names = sheets.map((sheet, index) => safeSheetName(sheet.name, index));
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`;
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rootRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRelationships),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelationships),
    "xl/styles.xml": strToU8(styles)
  };
  sheets.forEach((sheet, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet)); });
  return zipSync(files, { level: 6 });
}

export function downloadXlsx(filename: string, sheets: SpreadsheetSheet[]) {
  const bytes = buildXlsx(sheets);
  const copied = Uint8Array.from(bytes);
  const blob = new Blob([copied.buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
