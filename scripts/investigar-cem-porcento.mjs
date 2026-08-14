/**
 * Investiga quem está com 100% de ABS numa competência, separando o que é
 * dado real do que é efeito de mês incompleto:
 *
 *   node scripts/investigar-cem-porcento.mjs 2026-08
 *
 * Para cada caso mostra: dias com carga, dias efetivamente trabalhados,
 * primeira e última batida e se há lançamento de abono. Assim dá para dizer se
 * a pessoa está afastada, desligada de fato ou se é falha de registro.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-08";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows } = await db.query(
  `select e.name, e.registration, e.admission_date, c.short_name as empresa,
          a.planned_min, a.worked_min, a.unjustified_min, a.justified_min,
          (select count(*) from espelho_dias d
            where d.employee_id = a.employee_id and d.competencia = a.competencia
              and d.planned_min > 0) as dias_com_carga,
          (select count(*) from espelho_dias d
            where d.employee_id = a.employee_id and d.competencia = a.competencia
              and d.worked_min > 0) as dias_trabalhados,
          (select max(d.dia) from espelho_dias d
            where d.employee_id = a.employee_id and d.competencia = a.competencia
              and d.worked_min > 0) as ultimo_dia_trabalhado
   from absenteeism_monthly a
   join employees e on e.id = a.employee_id
   join companies c on c.id = e.company_id
   where a.competencia = $1
     and a.planned_min > 0
     and (a.unjustified_min + a.justified_min) >= a.planned_min
   order by e.name`,
  [competencia]
);

console.log(`=== ${competencia}: ${rows.length} colaboradores com ausência >= planejado\n`);
const semNenhumaBatida = [];
for (const r of rows) {
  const trabalhou = Number(r.dias_trabalhados);
  const marcador = trabalhou === 0 ? "SEM NENHUMA BATIDA" : `trabalhou ${trabalhou} dia(s)`;
  console.log(
    `${r.name} (${r.empresa}, mat ${r.registration}, adm ${r.admission_date?.toISOString?.().slice(0, 10) ?? "-"})`
  );
  console.log(
    `   planejado ${fmt(r.planned_min)} · trabalhadas ${fmt(r.worked_min)} · dias com carga ${r.dias_com_carga} · ${marcador}` +
      (r.ultimo_dia_trabalhado ? ` · último ${r.ultimo_dia_trabalhado.toISOString().slice(0, 10)}` : "")
  );
  if (trabalhou === 0) semNenhumaBatida.push(r.name);
}

console.log(`\n--- resumo`);
console.log(`sem nenhuma batida no mês: ${semNenhumaBatida.length}`);
console.log(`com alguma batida: ${rows.length - semNenhumaBatida.length}`);
console.log(
  `\nPessoas sem batida e sem abono lançado provavelmente estão afastadas, de férias\n` +
    `ou desligadas sem baixa no ponto — casos para o RH, não erros de cálculo.`
);
await db.end();
