/**
 * Extrato individual do colaborador na competência:
 *
 *   node scripts/extrato-colaborador.mjs "MARCIA ADRIANA" 2026-08
 *
 * Gera um resumo legível do dia a dia — para responder a questionamentos do
 * tipo "não tive faltas e apareço com ABS alto". Sai direto do banco, com os
 * dias que o ponto registrou.
 */
import { writeFileSync } from "node:fs";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const busca = (process.argv[2] ?? "").toUpperCase();
const competencia = process.argv[3] ?? "2026-08";
const env = carregarEnv();

const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const brDate = (d) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

const db = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const { rows: pessoas } = await db.query(
  `select e.id, e.name, e.registration, c.short_name empresa, s.name setor, e.role,
          a.planned_min, a.worked_min, a.unjustified_min, a.justified_min, a.tolerance_min
   from employees e
   join companies c on c.id = e.company_id
   left join sectors s on s.id = e.sector_id
   left join absenteeism_monthly a on a.employee_id = e.id and a.competencia = $2
   where upper(e.name) like $1`,
  [`%${busca}%`, competencia]
);

if (!pessoas.length) {
  console.error(`ninguém encontrado com "${busca}"`);
  process.exit(1);
}

const linhas = [];
for (const p of pessoas) {
  const { rows: dias } = await db.query(
    `select dia, planned_min, worked_min, absence_min, late_min, excused_min
     from espelho_dias
     where employee_id = $1 and competencia = $2 and planned_min > 0
     order by dia`,
    [p.id, competencia]
  );

  const trabalhados = dias.filter((d) => d.worked_min > 0);
  const semRegistro = dias.filter((d) => d.worked_min === 0);
  const atrasoTotal = dias.reduce((a, d) => a + d.late_min, 0);

  linhas.push(`EXTRATO — ${p.name}`);
  linhas.push(`Matrícula ${p.registration} · ${p.empresa} · ${p.setor ?? "sem setor"}`);
  linhas.push(`Competência: ${competencia}`);
  linhas.push("");
  linhas.push(`Dias com jornada prevista: ${dias.length}`);
  linhas.push(`Dias efetivamente trabalhados: ${trabalhados.length}`);
  linhas.push(`Dias sem registro de ponto: ${semRegistro.length}`);
  linhas.push(`Total de atraso no período: ${fmt(atrasoTotal)}`);
  linhas.push("");
  linhas.push("DIA A DIA");
  linhas.push("Data        Previsto  Trabalhado  Falta   Atraso  Situação");
  for (const d of dias) {
    const situacao =
      d.worked_min > 0
        ? d.late_min > 0
          ? "trabalhou (com atraso)"
          : "trabalhou"
        : "sem registro";
    linhas.push(
      `${brDate(d.dia)}  ${fmt(d.planned_min).padStart(7)}  ${fmt(d.worked_min).padStart(9)}  ${fmt(d.absence_min).padStart(6)}  ${fmt(d.late_min).padStart(6)}  ${situacao}`
    );
  }
  linhas.push("");

  if (semRegistro.length) {
    const primeiro = brDate(semRegistro[0].dia);
    const ultimo = brDate(semRegistro[semRegistro.length - 1].dia);
    linhas.push(
      `OBSERVAÇÃO: os ${semRegistro.length} dias sem registro concentram-se de ${primeiro} a ${ultimo}.`
    );
  }
  linhas.push("=".repeat(64));
  linhas.push("");
}

const texto = linhas.join("\n");
console.log(texto);
const arquivo = `extrato-${busca.toLowerCase().replace(/\s+/g, "-")}-${competencia}.txt`;
writeFileSync(arquivo, texto, "utf8");
console.log(`\n[extrato] salvo em ${arquivo}`);
await db.end();
