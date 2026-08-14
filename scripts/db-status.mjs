/**
 * Estado atual da carga no banco:  node scripts/db-status.mjs [competencia]
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
console.log("employees:", (await q("select count(*) c from employees"))[0].c);
console.log("com external_id:", (await q("select count(*) c from employees where external_id is not null"))[0].c);
console.log(`espelhos ${competencia}:`, (await q("select count(*) c from absenteeism_monthly where competencia=$1", [competencia]))[0].c);
console.log("\nimport_runs (últimas 5):");
for (const r of await q("select competencia, source, status, rows_imported, left(coalesce(error_message,''),80) err, started_at from import_runs order by started_at desc limit 5")) {
  console.log(` ${r.started_at.toISOString().slice(0,19)} ${r.competencia} ${r.source} ${r.status} rows=${r.rows_imported ?? "-"} ${r.err}`);
}
console.log("\nmatrícula 6053 (Tattini):");
for (const r of await q("select registration, external_id, name from employees where registration='6053'")) {
  console.log(` ${r.registration} ext=${r.external_id} ${r.name}`);
}
await db.end();
