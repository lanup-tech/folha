/**
 * Quantifica quantos registros do banco ficaram zerados na carga e cruza com
 * duplicidade de external_id, para identificar a causa.
 *
 *   node scripts/diagnose-zerados.mjs 2026-07
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-07";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

console.log("=== volume");
console.log(" employees:", (await q("select count(*) c from employees"))[0].c);
console.log(
  " espelhos:",
  (await q("select count(*) c from absenteeism_monthly where competencia=$1", [competencia]))[0].c
);
console.log(
  " espelhos ZERADOS (planned=0 e worked=0):",
  (await q(
    "select count(*) c from absenteeism_monthly where competencia=$1 and planned_min=0 and worked_min=0",
    [competencia]
  ))[0].c
);

console.log("\n=== employees duplicados por nome (mesma pessoa gravada 2x?)");
for (const r of await q(
  `select name, count(*) c, array_agg(external_id) ids, array_agg(registration) mats
   from employees group by name having count(*) > 1 order by c desc limit 10`
)) {
  console.log(`  ${r.name}: ${r.c}x · ids=${r.ids.join(",")} · mats=${r.mats.join(",")}`);
}

console.log("\n=== employees SEM espelho na competência");
const semEspelho = await q(
  `select e.name, e.external_id from employees e
   left join absenteeism_monthly a on a.employee_id = e.id and a.competencia = $1
   where a.id is null limit 10`,
  [competencia]
);
console.log(" total:", (await q(
  `select count(*) c from employees e
   left join absenteeism_monthly a on a.employee_id = e.id and a.competencia = $1
   where a.id is null`,
  [competencia]
))[0].c);
for (const r of semEspelho) console.log(`  ${r.name} (id API ${r.external_id})`);

console.log("\n=== amostra de zerados (com id da API para reconsultar)");
for (const r of await q(
  `select e.name, e.external_id, e.company_id from absenteeism_monthly a
   join employees e on e.id = a.employee_id
   where a.competencia=$1 and a.planned_min=0 and a.worked_min=0 limit 8`,
  [competencia]
)) {
  console.log(`  ${r.name} · id API ${r.external_id}`);
}
await db.end();
