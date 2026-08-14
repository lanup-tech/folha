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
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false });
  const headerIdx = rows.findIndex((r) => r?.some((c) => nameKey(c) === "FUNCIONARIO"));
  if (headerIdx < 0) throw new Error(`${file}: cabeçalho 'Funcionário' não encontrado`);
  const header = rows[headerIdx].map((h) => nameKey(h));
  const col = (label) => header.findIndex((h) => h.startsWith(nameKey(label)));
  const totalsRow = new Set(["TOTAIS", "TOTAL", "TOTAL GERAL"]);
  return {
    sheetName,
    col,
    rows: rows
      .slice(headerIdx + 1)
      .filter((r) => r?.length && String(r[col("Funcionário")] ?? "").trim())
      .filter((r) => !totalsRow.has(nameKey(r[col("Funcionário")]))),
  };
}

/** Nome da aba dos relatórios traz o período: "01-07-2026 a 31-07-2026" */
function sheetPeriod(sheetName) {
  const m = sheetName.match(/(\d{2})-(\d{2})-(\d{4})\s*a\s*(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return { start: `${m[3]}-${m[2]}-${m[1]}`, end: `${m[6]}-${m[5]}-${m[4]}` };
}

const lastDay = (() => {
  const [y, mo] = competencia.split("-").map(Number);
  return String(new Date(y, mo, 0).getDate()).padStart(2, "0");
})();
const expectedStart = `${competencia}-01`;
const expectedEnd = `${competencia}-${lastDay}`;
const periodIssues = [];

/**
 * Valida o período da aba contra a competência.
 * Retorna: 'ok' | 'partial' (mesmo mês, incompleto) | 'wrong' (outro mês)
 */
function checkPeriod(file, sheetName) {
  const p = sheetPeriod(sheetName);
  if (!p) return "ok"; // aba sem período no nome — segue
  if (!p.start.startsWith(competencia) && !p.end.startsWith(competencia)) {
    periodIssues.push(`${file}: aba "${sheetName}" é de OUTRO PERÍODO — arquivo ignorado, reexportar ${expectedStart} a ${expectedEnd}`);
    return "wrong";
  }
  if (p.start !== expectedStart || p.end !== expectedEnd) {
    periodIssues.push(`${file}: aba "${sheetName}" cobre só parte do mês — reexportar ${expectedStart} a ${expectedEnd}`);
    return "partial";
  }
  return "ok";
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
const abonoStatus = checkPeriod("AbonoDeFaltas.xlsx", abono.sheetName);
if (abonoStatus === "wrong") abono.rows = [];
const cFunc = abono.col("Funcionário");
const cEmp = abono.col("Empresa");
const cMot = abono.col("Motivo");
const cHDia = abono.col("Horas Diurnas");
const cHNot = abono.col("Horas Noturnas");
const cPer = abono.col("Período Abonado");

const excusedByName = new Map(); // ABONADO -> min por pessoa (entra em ABONADA)
const justifiedByName = new Map(); // JUSTIFICADO -> min por pessoa (entra em JUSTIFICADA)
const ignoredByName = new Map(); // DESCONSIDERAR -> min por pessoa (FORA do ABS)
const motivoAgg = new Map(); // motivo -> { treatment, totalMin, occurrences }
const unknownMotivos = new Set();
// motivo -> minutos por pessoa (qualquer tratamento), para explicar afastamentos
const motivosByName = new Map();

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

  const k = nameKey(r[cFunc]);
  const porPessoa = motivosByName.get(k) ?? new Map();
  porPessoa.set(motivoRaw, (porPessoa.get(motivoRaw) ?? 0) + minutes);
  motivosByName.set(k, porPessoa);

  const destino =
    t === "ABONADO" ? excusedByName : t === "JUSTIFICADO" ? justifiedByName : ignoredByName;
  destino.set(k, (destino.get(k) ?? 0) + minutes);
}

/** Motivo com mais horas da pessoa na competência (explica afastamentos). */
function motivoPredominante(k) {
  const m = motivosByName.get(k);
  if (!m) return null;
  const [motivo, min] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return { motivo, min, treatment: treatmentByMotivo.get(nameKey(motivo)) ?? "DESCONSIDERAR" };
}

// ---------- 2. Extrato de Horas -> HE + empresa por pessoa ----------

const extrato = readSheet("Extrato de Horas.xlsx");
const extratoStatus = checkPeriod("Extrato de Horas.xlsx", extrato.sheetName);
const xFunc = extrato.col("Funcionário");
const xEmp = extrato.col("Empresa");
const xHe = extrato.col("Extra Diurna Trabalhada"); // EX¹
const heByName = new Map();
const companyNameByName = new Map();
for (const r of extrato.rows) {
  const k = nameKey(r[xFunc]);
  // extrato de outro mês: aproveita só o mapeamento nome->empresa, nunca as horas
  if (extratoStatus === "ok") heByName.set(k, toMinutes(r[xHe]));
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
if (checkPeriod("Absenteismo.xlsx", abs.sheetName) !== "ok") {
  console.error(`[ingest] ABORTADO: Absenteismo.xlsx precisa cobrir o mês inteiro (${expectedStart} a ${expectedEnd}) — é a base do quadro.`);
  console.error(periodIssues.join("\n"));
  process.exit(1);
}
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
  const fjMin = toMinutes(r[aJust]); // Faltas Justificadas medidas pelo ponto
  const unjustifiedMin = toMinutes(r[aInj]);

  // ---- Rateio das Faltas Justificadas conforme o TRATAMENTO DO MOTIVO ----
  //
  // O ponto mede o total de falta justificada (fjMin), mas não sabe o que cada
  // motivo significa para o negócio — isso vem da base de motivos (front).
  // Distribuímos fjMin em ABONADA / JUSTIFICADA / DESCONSIDERADA na proporção
  // das horas lançadas no Abono de Faltas por tratamento.
  //
  // DESCONSIDERAR (afastamento, licença-maternidade, folga compensação…) fica
  // FORA do ABS HORA — é a regra da base de motivos. O planejado é mantido
  // (decisão do cliente, 14/08/2026): quem está afastado o mês inteiro aparece
  // com ABS% = 0%, como se tivesse trabalhado sem faltas.
  //
  // A proporção evita o vício da valoração 8h fixas do relatório (que inflava
  // as horas em jornadas menores e em dias sem escala) — o total continua
  // ancorado no que o ponto mediu.
  const excusedRaw = excusedByName.get(k) ?? 0;
  const justifiedRaw = justifiedByName.get(k) ?? 0;
  const ignoredRaw = ignoredByName.get(k) ?? 0;
  const lancadoRaw = excusedRaw + justifiedRaw + ignoredRaw;

  let excusedMin = 0;
  let justifiedMin = 0;
  let ignoredMin = 0;
  if (lancadoRaw > 0) {
    excusedMin = Math.round((fjMin * excusedRaw) / lancadoRaw);
    ignoredMin = Math.round((fjMin * ignoredRaw) / lancadoRaw);
    justifiedMin = Math.max(0, fjMin - excusedMin - ignoredMin); // resto, sem perder minutos
  } else {
    // sem lançamento no Abono: o ponto marcou falta justificada mas ninguém
    // registrou o motivo — mantém em JUSTIFICADA e sinaliza
    justifiedMin = fjMin;
    if (fjMin > 0) {
      inconsistencies.push(
        `${rawName}: ${Math.round(fjMin / 60)}h de falta justificada no ponto sem lançamento no Abono de Faltas`
      );
    }
  }

  if (lancadoRaw - fjMin > 60) {
    inconsistencies.push(
      `${rawName}: abono lançado (${Math.round(lancadoRaw / 60)}h) excede a falta justificada do ponto (${Math.round(fjMin / 60)}h) — valoração 8h/dia do relatório`
    );
  }

  const pred = motivoPredominante(k);
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
    /** Horas de motivos DESCONSIDERAR — fora do ABS HORA, exibidas para auditoria */
    ignoredMin,
    plannedMin,
    // motivo que responde pela maior parte das horas de abono da pessoa —
    // usado para explicar afastamentos nos alertas do painel
    mainMotivo: pred?.motivo ?? null,
    mainMotivoTreatment: pred?.treatment ?? null,
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
    periodIssues,
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
for (const issue of periodIssues) console.log(`  PERÍODO: ${issue}`);
