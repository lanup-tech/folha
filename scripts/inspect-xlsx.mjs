// Inspeção rápida das planilhas cruas: abas, cabeçalhos e primeiras linhas
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

const dir = process.argv[2] ?? "data/raw/2026-07";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".xlsx"))) {
  const wb = XLSX.read(readFileSync(join(dir, file)));
  console.log(`\n=== ${file} — abas: ${wb.SheetNames.join(", ")}`);
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false });
    console.log(`--- aba "${name}" (${rows.length} linhas)`);
    for (const row of rows.slice(0, 4)) console.log(JSON.stringify(row));
  }
}
