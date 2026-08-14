/**
 * Reconsulta a API só para os registros que ficaram zerados na carga
 * (efeito de respostas vazias intermitentes) e corrige no banco:
 *
 *   node scripts/refazer-zerados.mjs 2026-07
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-07";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const BASE = "https://api.ezpointweb.com.br/ezweb-ws";
const EMPRESA = env.NOBRIPONTO_API_EMPRESA ?? env.EZPOINT_EMPRESA;
const toMin = (v) => {
  const m = String(v ?? "").trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, i) => {
  const r = await fetch(BASE + p, i);
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return t.trim();
  }
};

const token = await api("/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    empresa: EMPRESA,
    usuario: env.NOBRIPONTO_API_USER ?? env.EZPOINT_USUARIO,
    senha: env.NOBRIPONTO_API_PASSWORD ?? env.EZPOINT_SENHA,
  }),
});
const auth = { Authorization: `Bearer ${typeof token === "string" ? token : token.token}` };

const [y, mo] = competencia.split("-").map(Number);
const dataInicio = `${competencia}-01`;
const dataFim = `${competencia}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows: alvos } = await db.query(
  `select a.employee_id, e.external_id, e.name
   from absenteeism_monthly a join employees e on e.id = a.employee_id
   where a.competencia = $1 and a.planned_min = 0 and a.worked_min = 0
     and e.external_id is not null`,
  [competencia]
);
console.log(`[refazer] ${alvos.length} registros zerados para reconsultar`);

let corrigidos = 0;
let confirmadosZero = 0;
for (const alvo of alvos) {
  await wait(2300);
  const esp = await api(
    `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${alvo.external_id}&dataInicio=${dataInicio}&dataFim=${dataFim}`,
    { headers: auth }
  );
  const t = esp?.totalColunas;
  const carga = toMin(t?.cargaHoraria);
  if (!t || (carga === 0 && !(esp.dias ?? []).length)) {
    console.log(`  ? ${alvo.name}: API segue sem dados`);
    continue;
  }
  if (carga === 0) {
    confirmadosZero += 1;
    continue; // realmente sem escala no mês (admissão posterior etc.)
  }
  await db.query(
    `update absenteeism_monthly set planned_min=$3, worked_min=$4, tolerance_min=$5,
       justified_min=$6, unjustified_min=$7, imported_at=now()
     where employee_id=$1 and competencia=$2`,
    [
      alvo.employee_id,
      competencia,
      carga,
      toMin(t.horasTrabalhadasDiurnas) + toMin(t.horasTrabalhadasNoturnas),
      toMin(t.atraso),
      toMin(t.horasAbonadas),
      toMin(t.falta),
    ]
  );
  await db.query(
    `update hour_extract_monthly set day_min=$3, night_min=$4, total_min=$5, imported_at=now()
     where employee_id=$1 and competencia=$2`,
    [
      alvo.employee_id,
      competencia,
      toMin(t.extraDiurna),
      toMin(t.extraNoturna),
      toMin(t.extraDiurna) + toMin(t.extraNoturna),
    ]
  );
  corrigidos += 1;
  console.log(`  ✓ ${alvo.name}: carga ${t.cargaHoraria}, HE ${t.extraDiurna}`);
}

console.log(`\n[refazer] corrigidos: ${corrigidos} · zero legítimo (sem escala): ${confirmadosZero}`);
await db.end();
