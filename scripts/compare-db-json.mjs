/**
 * Conferência pós-carga: banco (API EzPoint) × JSON validado (planilhas):
 *
 *   node scripts/compare-db-json.mjs 2026-07
 *
 * Compara, por colaborador (chave: matrícula, senão nome normalizado):
 *   planned_min (cargaHoraria API)     × plannedMin (Horas Previstas planilha)
 *   hour_extract total (extraDiurna)   × heMin (EX¹ planilha)
 *   unjustified_min (falta API)        × unjustifiedMin (FI planilha)
 *   justified_min (horasAbonadas API)  × excused+justified (FJ planilha)
 *
 * É a extensão da conciliação amostral (scripts/reconcile-api.mjs) para o
 * quadro inteiro — mostra taxa de match e as maiores divergências.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-07";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const json = JSON.parse(
  readFileSync(`data/competencias/${competencia}.json`, "utf8").replace(/^﻿/, "")
);

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const jsonByKey = new Map();
for (const e of json.employees) {
  jsonByKey.set(e.registration || norm(e.name), e);
}

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(
  `select e.registration, e.name,
          a.planned_min, a.worked_min, a.unjustified_min, a.justified_min, a.tolerance_min,
          coalesce(h.total_min, 0) as he_min
   from absenteeism_monthly a
   join employees e on e.id = a.employee_id
   left join hour_extract_monthly h
     on h.employee_id = a.employee_id and h.competencia = a.competencia
   where a.competencia = $1`,
  [competencia]
);
await db.end();

const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const fields = [
  ["planejado", (d) => d.planned_min, (j) => j.plannedMin],
  ["HE", (d) => d.he_min, (j) => j.heMin],
  ["injustificada(falta API × FI)", (d) => d.unjustified_min, (j) => j.unjustifiedMin],
  ["abonos(API × FJ planilha)", (d) => d.justified_min, (j) => j.excusedMin + j.justifiedMin],
];

let matched = 0;
const misses = { semJson: [] };
const stats = Object.fromEntries(fields.map(([n]) => [n, { ok: 0, diff: [] }]));

for (const d of rows) {
  const j = jsonByKey.get(d.registration) ?? jsonByKey.get(norm(d.name));
  if (!j) {
    misses.semJson.push(d.name);
    continue;
  }
  matched += 1;
  for (const [nome, fd, fj] of fields) {
    const a = fd(d);
    const b = fj(j);
    if (Math.abs(a - b) <= 1) stats[nome].ok += 1;
    else stats[nome].diff.push({ name: d.name, banco: a, planilha: b, delta: a - b });
  }
}

console.log(`=== CONFERÊNCIA ${competencia}: banco (API) × planilhas validadas ===`);
console.log(`no banco: ${rows.length} · casados com o JSON: ${matched} · só no banco (sem planilha): ${misses.semJson.length}`);
for (const [nome, s] of Object.entries(stats)) {
  console.log(`\n${nome}: ${s.ok}/${matched} batem`);
  const top = s.diff.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  for (const d of top) {
    console.log(`  ${d.name}: banco ${fmt(d.banco)} × planilha ${fmt(d.planilha)}`);
  }
  if (s.diff.length > 5) console.log(`  ... +${s.diff.length - 5} divergências`);
}
