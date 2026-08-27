/**
 * Exporta o detalhe diário do espelho para o painel consumir:
 *
 *   node scripts/exportar-dias.mjs 2026-07
 *
 * Gera data/competencias/<AAAA-MM>-dias.json com um registro por colaborador
 * (chave = matrícula) contendo os dias que tiveram carga horária. É o que
 * alimenta o gráfico diário no detalhe da pessoa — o último nível do
 * aprofundamento: consolidado → dimensão → pessoa → dia.
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-07";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const db = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();
const { rows } = await db.query(
  `select e.registration, d.dia, d.planned_min, d.worked_min,
          d.absence_min, d.late_min, d.excused_min, d.extra_min
   from espelho_dias d
   join employees e on e.id = d.employee_id
   where d.competencia = $1 and d.planned_min > 0
   order by e.registration, d.dia`,
  [competencia]
);
await db.end();

const porPessoa = {};
for (const r of rows) {
  const k = r.registration;
  if (!k) continue;
  (porPessoa[k] ??= []).push({
    dia: r.dia.toISOString().slice(0, 10),
    planejado: r.planned_min,
    trabalhado: r.worked_min,
    falta: r.absence_min,
    atraso: r.late_min,
    abonado: r.excused_min,
    extra: r.extra_min,
  });
}

const saida = `data/competencias/${competencia}-dias.json`;
writeFileSync(saida, JSON.stringify(porPessoa), "utf8");
console.log(
  `[dias] ${saida}: ${Object.keys(porPessoa).length} colaboradores, ${rows.length} dias`
);
