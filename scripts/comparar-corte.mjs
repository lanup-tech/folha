/**
 * Compara o ABS% do mês em curso com e sem o corte por dia — evidência de que
 * contar o mês inteiro infla o indicador com dias que ainda não aconteceram.
 *
 *   node scripts/comparar-corte.mjs 2026-08 13
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-08";
const corte = Number(process.argv[3] ?? new Date().getDate() - 1);

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const totais = async (ate) =>
  (
    await db.query(
      `select coalesce(sum(planned_min),0) plan,
              coalesce(sum(absence_min),0) falta,
              coalesce(sum(late_min),0) atraso,
              coalesce(sum(excused_min),0) abon,
              count(distinct employee_id) pessoas
       from espelho_dias
       where competencia = $1 and extract(day from dia) <= $2`,
      [competencia, ate]
    )
  ).rows[0];

console.log(`=== ${competencia}: efeito do corte por dia`);
for (const [rotulo, ate] of [[`até o dia ${corte}`, corte], ["mês inteiro", 31]]) {
  const r = await totais(ate);
  const plan = Number(r.plan);
  const abs = Number(r.falta) + Number(r.atraso) + Number(r.abon);
  console.log(
    `${rotulo.padEnd(18)} pessoas=${r.pessoas} planejado=${fmt(plan).padStart(10)} ABS=${fmt(abs).padStart(10)} → ${plan ? ((abs / plan) * 100).toFixed(2) : "0.00"}%`
  );
}
await db.end();
