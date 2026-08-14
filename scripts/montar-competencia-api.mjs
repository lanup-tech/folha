/**
 * Monta uma competência SEM o relatório de Absenteísmo, usando:
 *   - banco (carga da API): planejado, trabalhadas, falta, atraso, HE
 *   - Abono de Faltas do RPA: motivos (abonada × justificada × desconsiderar)
 *
 *   node scripts/montar-competencia-api.mjs 2026-08
 *
 * É o caminho para o mês corrente e para quando a tela de Absenteísmo não
 * consegue gerar o arquivo (ela processa 1 funcionário por requisição e trava
 * com o quadro completo). As regras de cálculo são as mesmas da ingestão por
 * planilha — ver docs/integracao-nobriponto.md.
 *
 *   Faltas Injustificadas = falta + atraso  (opção "Considerar Atraso")
 *   Faltas Justificadas   = horasAbonadas do espelho
 *   rateio de FJ em ABONADA / JUSTIFICADA / DESCONSIDERADA pelo motivo
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import pg from "pg";

const competencia = process.argv[2] ?? new Date().toISOString().slice(0, 7);
const rawDir = process.argv[3] ?? `data/raw/${competencia}`;

/**
 * MÊS EM CURSO: a API devolve a cargaHoraria do mês INTEIRO, e os dias que
 * ainda não aconteceram entram como "falta" — o que infla o ABS% (agosto até
 * o dia 14 dava 57,9% contra 11,8% no cálculo parcial).
 *
 * Por isso a competência corrente é gravada com DUAS visões:
 *   - `employees`        → mês cheio (padrão, como o ponto reporta)
 *   - `employeesParcial` → apenas os dias 1..corte (ontem)
 * O painel alterna entre elas pela flag "Parcial" (ver components/partial-toggle).
 */
const hoje = new Date();
const competenciaCorrente = competencia === hoje.toISOString().slice(0, 7);
const diaCorte = hoje.getDate() - 1;
if (competenciaCorrente) {
  console.log(`[montar] mês em curso: gerando visão cheia + parcial (dias 1 a ${diaCorte})`);
}

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

// ---------- utilitários (iguais aos da ingestão por planilha) ----------
function toMinutes(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 24 * 60);
  const m = String(v).trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}
function fixEncoding(s) {
  if (typeof s !== "string" || !/[ÃÂ]/.test(s)) return s;
  const r = Buffer.from(s, "latin1").toString("utf8");
  return r.includes("�") ? s : r;
}
function nameKey(s) {
  return fixEncoding(String(s ?? ""))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
const companyByCnpj = {
  10328634000121: "EMPREENDIMENTOS",
  30511674000111: "PARTICIPACOES",
  10550544000180: "TATTINI",
};

// ---------- motivos ----------
const motivos = JSON.parse(readFileSync("lib/data/motivos.json", "utf8").replace(/^﻿/, ""));
const treatmentByMotivo = new Map(motivos.map((m) => [nameKey(m.name), m.treatment]));

// ---------- Abono de Faltas (RPA) ----------
const excusedByName = new Map();
const justifiedByName = new Map();
const ignoredByName = new Map();
const motivosByName = new Map();
const motivoAgg = new Map();
const unknownMotivos = new Set();
let lancamentos = 0;

const abonoPath = join(rawDir, "AbonoDeFaltas.xlsx");
if (existsSync(abonoPath)) {
  const wb = XLSX.read(readFileSync(abonoPath));
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false });
  const headerIdx = rows.findIndex((r) => r?.some((c) => nameKey(c) === "FUNCIONARIO"));
  const header = rows[headerIdx].map((h) => nameKey(h));
  const col = (l) => header.findIndex((h) => h.startsWith(nameKey(l)));
  const cFunc = col("Funcionário");
  const cMot = col("Motivo");
  const cHDia = col("Horas Diurnas");
  const cHNot = col("Horas Noturnas");
  const cPer = col("Período Abonado");
  const cData = col("Data");

  for (const r of rows.slice(headerIdx + 1)) {
    if (!r?.length || !String(r[cFunc] ?? "").trim()) continue;
    if (["TOTAIS", "TOTAL", "TOTAL GERAL"].includes(nameKey(r[cFunc]))) continue;
    void cData; // o rateio usa proporção, não o total absoluto — data não corta
    lancamentos += 1;
    const motivoRaw = fixEncoding(String(r[cMot] ?? "").trim());
    const treatment = treatmentByMotivo.get(nameKey(motivoRaw));
    if (!treatment) unknownMotivos.add(motivoRaw);
    let minutes = toMinutes(r[cHDia]) + toMinutes(r[cHNot]);
    if (minutes === 0) {
      const p = String(r[cPer] ?? "").trim();
      minutes = p === "O dia todo." ? 480 : p ? 240 : 0;
    }
    const t = treatment ?? "DESCONSIDERAR";
    const agg = motivoAgg.get(motivoRaw) ?? { treatment: t, totalMin: 0, occurrences: 0 };
    agg.totalMin += minutes;
    agg.occurrences += 1;
    motivoAgg.set(motivoRaw, agg);

    const k = nameKey(r[cFunc]);
    const pp = motivosByName.get(k) ?? new Map();
    pp.set(motivoRaw, (pp.get(motivoRaw) ?? 0) + minutes);
    motivosByName.set(k, pp);

    const destino =
      t === "ABONADO" ? excusedByName : t === "JUSTIFICADO" ? justifiedByName : ignoredByName;
    destino.set(k, (destino.get(k) ?? 0) + minutes);
  }
  console.log(`[montar] abono: ${lancamentos} lançamentos (aba ${sheetName})`);
} else {
  console.log(`[montar] AVISO: ${abonoPath} não encontrado — sem motivos, tudo entra como justificada`);
}

function motivoPredominante(k) {
  const m = motivosByName.get(k);
  if (!m) return null;
  const [motivo] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return { motivo, treatment: treatmentByMotivo.get(nameKey(motivo)) ?? "DESCONSIDERAR" };
}

// ---------- banco (API) ----------
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

// Mês cheio: totais do espelho (é como o ponto reporta).
const { rows: base } = await db.query(
  `select e.name, e.registration, e.role, e.admission_date, e.external_id,
          c.cnpj, s.name as sector,
          a.planned_min, a.worked_min, a.unjustified_min, a.justified_min, a.tolerance_min,
          coalesce(h.total_min, 0) as he_min
   from absenteeism_monthly a
   join employees e on e.id = a.employee_id
   join companies c on c.id = e.company_id
   left join sectors s on s.id = e.sector_id
   left join hour_extract_monthly h
     on h.employee_id = a.employee_id and h.competencia = a.competencia
   where a.competencia = $1`,
  [competencia]
);

// Visão parcial (só na competência corrente): soma o espelho dia a dia até o
// corte, de modo que dias futuros não contem como falta.
const baseParcial = competenciaCorrente
  ? (
      await db.query(
        `select e.name, e.registration, e.role, e.admission_date, e.external_id,
                c.cnpj, s.name as sector,
                coalesce(sum(d.planned_min), 0)  as planned_min,
                coalesce(sum(d.worked_min), 0)   as worked_min,
                coalesce(sum(d.absence_min), 0)  as unjustified_min,
                coalesce(sum(d.excused_min), 0)  as justified_min,
                coalesce(sum(d.late_min), 0)     as tolerance_min,
                coalesce(sum(d.extra_min), 0)    as he_min
         from espelho_dias d
         join employees e on e.id = d.employee_id
         join companies c on c.id = e.company_id
         left join sectors s on s.id = e.sector_id
         where d.competencia = $1 and extract(day from d.dia) <= $2
         group by e.name, e.registration, e.role, e.admission_date, e.external_id, c.cnpj, s.name`,
        [competencia, diaCorte]
      )
    ).rows
  : [];
await db.end();
console.log(`[montar] banco: ${base.length} registros da API`);
if (!base.length) {
  console.error(`[montar] ABORTADO: rode antes 'node scripts/load-competencia-api.mjs ${competencia}'`);
  process.exit(1);
}

// ---------- consolidação ----------
const inconsistencies = [];

/** Aplica as regras de cálculo sobre um conjunto de linhas do banco. */
function consolidar(linhas, registrarInconsistencias) {
  return linhas.map((r) => {
    const k = nameKey(r.name);
    const plannedMin = Number(r.planned_min ?? 0);
    // FI do relatório = falta + atraso (opção "Considerar Atraso")
    const unjustifiedMin = Number(r.unjustified_min ?? 0) + Number(r.tolerance_min ?? 0);
    const fjMin = Number(r.justified_min ?? 0); // horasAbonadas do espelho

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
      justifiedMin = Math.max(0, fjMin - excusedMin - ignoredMin);
    } else {
      justifiedMin = fjMin;
      if (fjMin > 0 && registrarInconsistencias) {
        inconsistencies.push(
          `${r.name}: ${Math.round(fjMin / 60)}h abonadas no ponto sem lançamento no Abono de Faltas`
        );
      }
    }

    const pred = motivoPredominante(k);
    return {
      company: companyByCnpj[String(r.cnpj ?? "").replace(/\D/g, "")] ?? "EMPREENDIMENTOS",
      sector: r.sector ?? "",
      registration: r.registration ?? "",
      name: r.name,
      role: r.role ?? "",
      admissionDate: r.admission_date
        ? r.admission_date.toISOString().slice(0, 10).split("-").reverse().join("/")
        : "",
      heMin: Number(r.he_min ?? 0),
      unjustifiedMin,
      excusedMin,
      justifiedMin,
      ignoredMin,
      plannedMin,
      mainMotivo: pred?.motivo ?? null,
      mainMotivoTreatment: pred?.treatment ?? null,
    };
  });
}

const employees = consolidar(base, true);
const employeesParcial = consolidar(baseParcial, false);

const motivoTotals = [...motivoAgg.entries()]
  .map(([motivo, agg]) => ({ motivo, ...agg }))
  .sort((a, b) => b.totalMin - a.totalMin);

mkdirSync("data/competencias", { recursive: true });
const outPath = join("data/competencias", `${competencia}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      competencia,
      employees,
      employeesParcial,
      motivoTotals,
      meta: {
        origem: "API EzPoint (espelho) + Abono de Faltas via RPA",
        mesEmCurso: competenciaCorrente,
        diaCorte: competenciaCorrente ? diaCorte : null,
        registrosApi: base.length,
        registrosParcial: baseParcial.length,
        lancamentosAbono: lancamentos,
        unknownMotivos: [...unknownMotivos],
        inconsistencies,
      },
    },
    null,
    2
  ),
  "utf8"
);

const resumo = (lista) => {
  const soma = (f) => lista.reduce((a, e) => a + f(e), 0);
  const abs = soma((e) => e.unjustifiedMin + e.excusedMin + e.justifiedMin);
  const plan = soma((e) => e.plannedMin);
  return {
    pessoas: lista.length,
    absPct: plan ? ((abs / plan) * 100).toFixed(2) : "0.00",
    fora: Math.round(soma((e) => e.ignoredMin) / 60),
    he: Math.round(soma((e) => e.heMin) / 60),
  };
};
console.log(`[montar] ${outPath}`);
const rc = resumo(employees);
console.log(`  MÊS CHEIO — colaboradores: ${rc.pessoas} · ABS%: ${rc.absPct}% · fora do cálculo: ${rc.fora}h · HE: ${rc.he}h`);
if (employeesParcial.length) {
  const rp = resumo(employeesParcial);
  console.log(`  PARCIAL (1 a ${diaCorte}) — colaboradores: ${rp.pessoas} · ABS%: ${rp.absPct}% · fora do cálculo: ${rp.fora}h · HE: ${rp.he}h`);
}
if (unknownMotivos.size) console.log(`  MOTIVOS FORA DA BASE: ${[...unknownMotivos].join(" | ")}`);
