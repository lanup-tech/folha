/**
 * Conciliação PLANILHAS CRUAS × API EzPoint (espelhoDePontos) para uma amostra
 * de colaboradores de uma competência:
 *
 *   node scripts/reconcile-api.mjs data/raw/2026-07 2026-07 [nomes extras...]
 *
 * Para cada colaborador da amostra compara:
 *   Horas Previstas (planilha)     × cargaHoraria (API)
 *   Horas Realizadas (planilha)    × horasTrabalhadas diurnas+noturnas (API)
 *   Faltas Injustificadas / J+I    × falta (API)  -> descobre o que "falta" representa
 *   HE = Extra Diurna Trab. (EX¹)  × extraDiurna (API)
 *   Abonada (nossa regra 8h/4h)    × horasAbonadas (API)
 *
 * Também imprime a jornada diária real (cargaHoraria dia a dia) dos casos
 * marcados, para auditar a regra "dia todo = 8h".
 *
 * Respeita o limite de 30 req/min (~2,2s por chamada).
 * Saída: data/raw/<pasta>/reconciliacao-<competencia>.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

const [, , rawDir = "data/raw/2026-07", competencia = "2026-07", ...extraNames] = process.argv;

const BASE = "https://api.ezpointweb.com.br/ezweb-ws";
const SAMPLE_SIZE = 30;

// ---------- .env.local (node não carrega sozinho) ----------
const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const EMPRESA = env.EZPOINT_EMPRESA ?? env.NOBRIPONTO_API_EMPRESA;
const USUARIO = env.EZPOINT_USUARIO ?? env.NOBRIPONTO_API_USER;
const SENHA = env.EZPOINT_SENHA ?? env.NOBRIPONTO_API_PASSWORD;
if (!EMPRESA || !USUARIO || !SENHA) {
  console.error("Credenciais da API ausentes no .env.local");
  process.exit(1);
}

// ---------- utilitários (mesmos da ingestão) ----------
function toMinutes(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 24 * 60);
  const m = String(v).trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}
const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
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
function readSheet(file) {
  const wb = XLSX.read(readFileSync(join(rawDir, file)));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
  const headerIdx = rows.findIndex((r) => r?.some((c) => nameKey(c) === "FUNCIONARIO"));
  const header = rows[headerIdx].map((h) => nameKey(h));
  const col = (label) => header.findIndex((h) => h.startsWith(nameKey(label)));
  const totals = new Set(["TOTAIS", "TOTAL", "TOTAL GERAL"]);
  return {
    col,
    rows: rows
      .slice(headerIdx + 1)
      .filter((r) => r?.length && String(r[col("Funcionário")] ?? "").trim())
      .filter((r) => !totals.has(nameKey(r[col("Funcionário")]))),
  };
}
const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));

// ---------- fontes ----------
const funcionarios = readJson(join(rawDir, "funcionarios_api.json")).listaDeFuncionarios ?? [];
const apiIdByName = new Map(funcionarios.map((f) => [nameKey(f.nome), f.id]));

const abs = readSheet("Absenteismo.xlsx");
const aF = abs.col("Funcionário");
const planilha = new Map(
  abs.rows.map((r) => [
    nameKey(r[aF]),
    {
      name: fixEncoding(String(r[aF]).trim()),
      prevista: toMinutes(r[abs.col("Horas Previstas")]),
      realizada: toMinutes(r[abs.col("Horas Realizadas")]),
      fj: toMinutes(r[abs.col("Faltas Justificadas")]),
      fi: toMinutes(r[abs.col("Faltas Injustificadas")]),
    },
  ])
);

const ext = readSheet("Extrato de Horas.xlsx");
for (const r of ext.rows) {
  const p = planilha.get(nameKey(r[ext.col("Funcionário")]));
  if (p) p.he = toMinutes(r[ext.col("Extra Diurna Trabalhada")]);
}

const abo = readSheet("AbonoDeFaltas.xlsx");
for (const r of abo.rows) {
  const p = planilha.get(nameKey(r[abo.col("Funcionário")]));
  if (!p) continue;
  const dia = toMinutes(r[abo.col("Horas Diurnas")]) + toMinutes(r[abo.col("Horas Noturnas")]);
  const periodo = String(r[abo.col("Período Abonado")] ?? "").trim();
  const granted = dia > 0 ? dia : periodo === "O dia todo." ? 480 : periodo ? 240 : 0;
  p.abonoDias = (p.abonoDias ?? 0) + 1;
  p.abonoMin = (p.abonoMin ?? 0) + granted;
}

// ---------- amostra ----------
const ranked = [...planilha.values()]
  .map((p) => ({ ...p, absPct: p.prevista > 0 ? (p.fi + p.fj) / p.prevista : 0 }))
  .sort((a, b) => b.absPct - a.absPct);
const sample = new Map();
for (const n of extraNames) {
  const p = planilha.get(nameKey(n));
  if (p) sample.set(nameKey(p.name), p);
}
for (const p of ranked.slice(0, 10)) sample.set(nameKey(p.name), p);
const step = Math.max(1, Math.floor(ranked.length / (SAMPLE_SIZE - sample.size)));
for (let i = 0; i < ranked.length && sample.size < SAMPLE_SIZE; i += step) {
  sample.set(nameKey(ranked[i].name), ranked[i]);
}

// ---------- API ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

const [y, mo] = competencia.split("-").map(Number);
const dataInicio = `${competencia}-01`;
const dataFim = `${competencia}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;

const token = await api("/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ empresa: EMPRESA, usuario: USUARIO, senha: SENHA }),
});
const auth = { Authorization: `Bearer ${typeof token === "string" ? token : token.token}` };

const results = [];
const detalhes = extraNames.map(nameKey);
let i = 0;
for (const [key, p] of sample) {
  i += 1;
  const id = apiIdByName.get(key);
  if (!id) {
    results.push({ name: p.name, error: "sem id na API (demitido?)" });
    continue;
  }
  await wait(2200); // 30 req/min
  process.stdout.write(`\r[reconcile] ${i}/${sample.size} ${p.name.slice(0, 40).padEnd(40)}`);
  try {
    const esp = await api(
      `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${id}&dataInicio=${dataInicio}&dataFim=${dataFim}`,
      { headers: auth }
    );
    const t = esp.totalColunas ?? {};
    const apiVals = {
      cargaHoraria: toMinutes(t.cargaHoraria),
      trabalhadas: toMinutes(t.horasTrabalhadasDiurnas) + toMinutes(t.horasTrabalhadasNoturnas),
      falta: toMinutes(t.falta),
      atraso: toMinutes(t.atraso),
      extraDiurna: toMinutes(t.extraDiurna),
      horasAbonadas: toMinutes(t.horasAbonadas),
    };
    const r = {
      name: p.name,
      prevista: { planilha: p.prevista, api: apiVals.cargaHoraria, ok: p.prevista === apiVals.cargaHoraria },
      realizada: { planilha: p.realizada, api: apiVals.trabalhadas, ok: p.realizada === apiVals.trabalhadas },
      faltaApi_vs_FI: { planilha: p.fi, api: apiVals.falta, ok: p.fi === apiVals.falta },
      faltaApi_vs_FIFJ: { planilha: p.fi + p.fj, api: apiVals.falta, ok: p.fi + p.fj === apiVals.falta },
      he: { planilha: p.he ?? 0, api: apiVals.extraDiurna, ok: (p.he ?? 0) === apiVals.extraDiurna },
      abonada: {
        planilhaRegra8h: p.abonoMin ?? 0,
        api: apiVals.horasAbonadas,
        ok: (p.abonoMin ?? 0) === apiVals.horasAbonadas,
      },
      abonoDias: p.abonoDias ?? 0,
    };
    if (detalhes.includes(key)) {
      r.jornadaDiaria = (esp.dias ?? [])
        .filter((d) => toMinutes(d.cargaHoraria) > 0)
        .map((d) => ({ data: d.data, cargaHoraria: d.cargaHoraria, falta: d.falta, abonadas: d.horasAbonadas }));
    }
    results.push(r);
  } catch (e) {
    results.push({ name: p.name, error: String(e).slice(0, 200) });
  }
}
console.log("");

// ---------- relatório ----------
const okRate = (field) => {
  const rows = results.filter((r) => !r.error);
  const ok = rows.filter((r) => r[field]?.ok).length;
  return `${ok}/${rows.length}`;
};
console.log(`\n=== CONCILIAÇÃO ${competencia} (amostra de ${results.length}) ===`);
console.log(`Horas Previstas  × cargaHoraria:   ${okRate("prevista")} batem`);
console.log(`Horas Realizadas × trabalhadas:    ${okRate("realizada")} batem`);
console.log(`Falta(API) = Injustificadas?       ${okRate("faltaApi_vs_FI")} batem`);
console.log(`Falta(API) = Just+Injust?          ${okRate("faltaApi_vs_FIFJ")} batem`);
console.log(`HE (EX¹)   × extraDiurna:          ${okRate("he")} batem`);
console.log(`Abonada (regra 8h) × horasAbonadas:${okRate("abonada")} batem`);

console.log("\n--- divergências ---");
for (const r of results) {
  if (r.error) {
    console.log(`${r.name}: ERRO ${r.error}`);
    continue;
  }
  const diffs = [];
  for (const [field, label] of [
    ["prevista", "prevista"],
    ["realizada", "realizada"],
    ["he", "HE"],
    ["abonada", "abonada"],
  ]) {
    const v = r[field];
    const a = v.planilha ?? v.planilhaRegra8h;
    if (!v.ok) diffs.push(`${label}: planilha ${fmt(a)} × api ${fmt(v.api)}`);
  }
  if (diffs.length) console.log(`${r.name} -> ${diffs.join(" | ")}`);
}

for (const r of results.filter((r) => r.jornadaDiaria)) {
  console.log(`\n--- jornada diária: ${r.name} (dias com carga) ---`);
  const porCarga = {};
  for (const d of r.jornadaDiaria) porCarga[d.cargaHoraria] = (porCarga[d.cargaHoraria] ?? 0) + 1;
  console.log(`cargas: ${JSON.stringify(porCarga)} · dias de abono na planilha: ${r.abonoDias}`);
}

const outPath = join(rawDir, `reconciliacao-${competencia}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
console.log(`\n[reconcile] detalhe completo em ${outPath}`);
