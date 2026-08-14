/**
 * Preenche o detalhe diário (espelho_dias) de uma competência já carregada:
 *
 *   node scripts/carregar-dias.mjs 2026-08
 *
 * Útil quando a competência foi carregada antes de existir a tabela de dias.
 * Cargas novas já gravam o diário direto (load-competencia-api.mjs).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? new Date().toISOString().slice(0, 7);
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
   where a.competencia = $1 and e.external_id is not null
     and not exists (select 1 from espelho_dias d
                     where d.employee_id = a.employee_id and d.competencia = $1)`,
  [competencia]
);
console.log(`[dias] ${alvos.length} colaboradores sem detalhe diário em ${competencia}`);

let ok = 0;
let vazios = 0;
for (const alvo of alvos) {
  await wait(2300);
  const esp = await api(
    `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${alvo.external_id}&dataInicio=${dataInicio}&dataFim=${dataFim}`,
    { headers: auth }
  );
  const dias = esp?.dias ?? [];
  if (!dias.length) {
    vazios += 1;
    continue;
  }
  for (const d of dias) {
    const [dd, mm, aaaa] = String(d.data ?? "").split("/");
    if (!aaaa) continue;
    await db.query(
      `insert into espelho_dias
         (employee_id, competencia, dia, planned_min, worked_min, absence_min, late_min, excused_min, extra_min)
       values ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
       on conflict (employee_id, dia) do update set
         planned_min = excluded.planned_min, worked_min = excluded.worked_min,
         absence_min = excluded.absence_min, late_min = excluded.late_min,
         excused_min = excluded.excused_min, extra_min = excluded.extra_min,
         imported_at = now()`,
      [
        alvo.employee_id,
        competencia,
        `${aaaa}-${mm}-${dd}`,
        toMin(d.cargaHoraria),
        toMin(d.horasTrabalhadasDiurnas) + toMin(d.horasTrabalhadasNoturnas),
        toMin(d.falta),
        toMin(d.atraso),
        toMin(d.horasAbonadas),
        toMin(d.extraDiurna) + toMin(d.extraNoturna),
      ]
    );
  }
  ok += 1;
  if (ok % 100 === 0) console.log(`[dias] ${ok}/${alvos.length}`);
}
console.log(`[dias] concluído: ${ok} com detalhe, ${vazios} sem dados`);
await db.end();
