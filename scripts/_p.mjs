import pg from "pg";
import { carregarEnv } from "./_env.mjs";
const env = carregarEnv();
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl:{rejectUnauthorized:false} });
await db.connect();
const { rows:[r] } = await db.query(`select count(*) n, max(imported_at) u from absenteeism_monthly where competencia='2026-09'`);
const { rows:[t] } = await db.query(`select count(*) n from employees`);
console.log(`setembro: ${r.n} de ${t.n} | ultima: ${r.u?.toISOString().slice(11,19) ?? '-'}`);
await db.end();
