/**
 * Ingestão de uma competência a partir dos relatórios CRUS do ponto:
 *
 *   node scripts/ingest-competencia.mjs data/raw/2026-07 2026-07
 *
 * Entrada (pasta):
 *   Absenteismo.xlsx       — Funcionário, Horas Previstas/Realizadas, Faltas J/I
 *   Extrato de Horas.xlsx  — Funcionário, Empresa, Extra Diurna Trabalhada (EX¹)
 *   AbonoDeFaltas.xlsx     — Funcionário, Empresa, Motivo, Período Abonado, Data, CID
 *   funcionarios_api.json  — GET /funcionario da API EzPoint (matrícula/setor/CNPJ)
 *
 * Regras (mesmas do fluxo Excel — ver docs/integracao-nobriponto.md):
 *   ABONADA     = lançamentos de abono cujo motivo tem tratamento ABONADO
 *                 (dia todo = 8h, meio período = 4h quando horas não informadas)
 *   JUSTIFICADA = Faltas Justificadas (relatório) - ABONADA, nunca negativo
 *   ABS HORA    = INJUSTIFICADA + ABONADA + JUSTIFICADA
 *
 * Saída: data/competencias/<competencia>.json (consumido pelo dashboard)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

const [, , rawDir = "data/raw/2026-07", competencia = "2026-07"] = process.argv;

// ---------- utilitários ----------

/** "138:40", "8:00:00" ou serial Excel -> minutos */
function toMinutes(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 24 * 60);
  const m = String(v).trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}

/** Repara mojibake (UTF-8 lido como Latin-1, ex.: "COBRANÃ‡A") */
function fixEncoding(s) {
  if (typeof s !== "string" || !/[ÃÂ]/.test(s)) return s;
  const repaired = Buffer.from(s, "latin1").toString("utf8");
  return repaired.includes("�") ? s : repaired;
}

/** Chave de junção por nome: caixa alta, sem acentos, espaços colapsados */
function nameKey(s) {
  return fixEncoding(String(s ?? ""))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function companyFromName(empresa) {
  const e = nameKey(empresa);
  if (e.includes("TATTINI")) return "TATTINI";
  if (e.includes("PARTICIPACOES")) return "PARTICIPACOES";
  if (e.includes("NEGOCIOS")) return "EMPREENDIMENTOS";
  return null;
}

const companyByCnpj = {
  10328634000121: "EMPREENDIMENTOS",
  30511674000111: "PARTICIPACOES",
  10550544000180: "TATTINI",
};

function readSheet(file) {
  const wb = XLSX.read(readFileSync(join(rawDir, file)));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
  const headerIdx = rows.findIndex((r) => r?.some((c) => nameKey(c) === "FUNCIONARIO"));
  if (headerIdx < 0) throw new Error(`${file}: cabeçalho 'Funcionário' não encontrado`);
  const header = rows[headerIdx].map((h) => nameKey(h));
  const col = (label) => header.findIndex((h) => h.startsWith(nameKey(label)));
  const totalsRow = new Set(["TOTAIS", "TOTAL", "TOTAL GERAL"]);
  return {
    col,
    rows: rows
      .slice(headerIdx + 1)
      .filter((r) => r?.length && String(r[col("Funcionário")] ?? "").trim())
      .filter((r) => !totalsRow.has(nameKey(r[col("Funcionário")]))),
  };
}

// ---------- fontes ----------

const readJson = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));

const motivos = readJson("lib/data/motivos.json");
const treatmentByMotivo = new Map(motivos.map((m) => [nameKey(m.name), m.treatment]));

const apiPath = join(rawDir, "funcionarios_api.json");
const apiByName = new Map();
if (existsSync(apiPath)) {
  const lista = readJson(apiPath).listaDeFuncionarios ?? [];
  for (const f of lista) {
    apiByName.set(nameKey(f.nome), {
      registration: String(f.matricula ?? "").trim(),
      sector: fixEncoding(f.setor || f.departamento || ""),
      role: fixEncoding(f.cargo ?? ""),
      admissionDate: f.dataAdmissao
        ? f.dataAdmissao.split("-").reverse().join("/")
        : "",
      company: companyByCnpj[String(f.cnpjCpfEmpresa ?? "").replace(/\D/g, "")] ?? null,
    });
  }
}

// ---------- 1. Abono de Faltas -> abonado por pessoa + totais por motivo ----------

const abono = readSheet("AbonoDeFaltas.xlsx");
const cFunc = abono.col("Funcionário");
const cEmp = abono.col("Empresa");
const cMot = abono.col("Motivo");
const cHDia = abono.col("Horas Diurnas");
const cHNot = abono.col("Horas Noturnas");
const cPer = abono.col("Período Abonado");

const excusedByName = new Map(); // ABONADO -> min por pessoa
const motivoAgg = new Map(); // motivo -> { treatment, totalMin, occurrences }
const unknownMotivos = new Set();

for (const r of abono.rows) {
  const motivoRaw = fixEncoding(String(r[cMot] ?? "").trim());
  const treatment = treatmentByMotivo.get(nameKey(motivoRaw));
  if (!treatment) unknownMotivos.add(motivoRaw);

  // horas informadas > período abonado (dia todo 8h / meio período 4h)
  let minutes = toMinutes(r[cHDia]) + toMinutes(r[cHNot]);
  if (minutes === 0) {
    const periodo = String(r[cPer] ?? "").trim();
    minutes = periodo === "O dia todo." ? 480 : periodo ? 240 : 0;
  }

  const t = treatment ?? "DESCONSIDERAR";
  const agg = motivoAgg.get(motivoRaw) ?? { treatment: t, totalMin: 0, occurrences: 0 };
  agg.totalMin += minutes;
  agg.occurrences += 1;
  motivoAgg.set(motivoRaw, agg);

  if (t === "ABONADO") {
    const k = nameKey(r[cFunc]);
    excusedByName.set(k, (excusedByName.get(k) ?? 0) + minutes);
  }
}

// ---------- 2. Extrato de Horas -> HE + empresa por pessoa ----------

const extrato = readSheet("Extrato de Horas.xlsx");
const xFunc = extrato.col("Funcionário");
const xEmp = extrato.col("Empresa");
const xHe = extrato.col("Extra Diurna Trabalhada"); // EX¹
const heByName = new Map();
const companyNameByName = new Map();
for (const r of extrato.rows) {
  const k = nameKey(r[xFunc]);
  heByName.set(k, toMinutes(r[xHe]));
  const comp = companyFromName(r[xEmp]);
  if (comp) companyNameByName.set(k, comp);
}
for (const r of abono.rows) {
  const k = nameKey(r[cFunc]);
  if (!companyNameByName.has(k)) {
    const comp = companyFromName(r[cEmp]);
    if (comp) companyNameByName.set(k, comp);
  }
}

// ---------- 3. Absenteísmo (base do quadro) -> consolidado ----------

const abs = readSheet("Absenteismo.xlsx");
const aFunc = abs.col("Funcionário");
const aPrev = abs.col("Horas Previstas");
const aJust = abs.col("Faltas Justificadas");
const aInj = abs.col("Faltas Injustificadas");

const employees = [];
const unmatched = [];
const inconsistencies = [];

for (const r of abs.rows) {
  const rawName = fixEncoding(String(r[aFunc]).trim());
  const k = nameKey(rawName);
  const api = apiByName.get(k);

  const company = api?.company ?? companyNameByName.get(k) ?? null;
  if (!api) unmatched.push(rawName);

  const plannedMin = toMinutes(r[aPrev]);
  const fjMin = toMinutes(r[aJust]);
  const unjustifiedMin = toMinutes(r[aInj]);
  const excusedMin = excusedByName.get(k) ?? 0;
  const justifiedMin = Math.max(0, fjMin - excusedMin);
  if (excusedMin > fjMin && excusedMin - fjMin > 30) {
    inconsistencies.push(
      `${rawName}: abonado (${excusedMin}min) maior que faltas justificadas do ponto (${fjMin}min)`
    );
  }

  employees.push({
    company: company ?? "EMPREENDIMENTOS",
    sector: api?.sector ?? "",
    registration: api?.registration ?? "",
    name: rawName,
    role: api?.role ?? "",
    admissionDate: api?.admissionDate ?? "",
    heMin: heByName.get(k) ?? 0,
    unjustifiedMin,
    excusedMin,
    justifiedMin,
    plannedMin,
  });
}

// ---------- saída ----------

const motivoTotals = [...motivoAgg.entries()]
  .map(([motivo, agg]) => ({ motivo, ...agg }))
  .sort((a, b) => b.totalMin - a.totalMin);

const out = {
  competencia,
  employees,
  motivoTotals,
  meta: {
    sources: {
      absenteismo: abs.rows.length,
      extratoDeHoras: extrato.rows.length,
      abonoDeFaltas: abono.rows.length,
      funcionariosApi: apiByName.size,
    },
    unmatchedFromApi: unmatched,
    unknownMotivos: [...unknownMotivos],
    inconsistencies,
  },
};

mkdirSync("data/competencias", { recursive: true });
const outPath = join("data/competencias", `${competencia}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log(`[ingest] ${outPath}`);
console.log(`  colaboradores (base absenteísmo): ${employees.length}`);
console.log(`  lançamentos de abono: ${abono.rows.length} · motivos distintos: ${motivoTotals.length}`);
console.log(`  sem match na API (demitidos?): ${unmatched.length}`);
if (unknownMotivos.size) console.log(`  MOTIVOS FORA DA BASE: ${[...unknownMotivos].join(" | ")}`);
if (inconsistencies.length) console.log(`  inconsistências abono×ponto: ${inconsistencies.length}`);
