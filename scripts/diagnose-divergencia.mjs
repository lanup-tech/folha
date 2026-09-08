/**
 * Diagnóstico das divergências banco (API) × planilha, caso a caso:
 *
 *   node scripts/diagnose-divergencia.mjs "NOME" 2026-07
 *
 * Mostra lado a lado o registro do banco, o da planilha e o espelho cru da API
 * (totais + dias), para descobrir a natureza de cada diferença.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const nomeBusca = (process.argv[2] ?? "").toUpperCase();
const competencia = process.argv[3] ?? "2026-07";

const env = carregarEnv();
const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

// ---- planilha ----
const json = JSON.parse(readFileSync(`data/competencias/${competencia}.json`, "utf8").replace(/^﻿/, ""));
const jrow = json.employees.find((e) => e.name.toUpperCase().includes(nomeBusca));
console.log("=== PLANILHA (relatórios crus)");
console.log(
  jrow
    ? ` planejado=${fmt(jrow.plannedMin)} HE=${fmt(jrow.heMin)} injust=${fmt(jrow.unjustifiedMin)} abonada=${fmt(jrow.excusedMin)} just=${fmt(jrow.justifiedMin)} motivo=${jrow.mainMotivo ?? "-"}`
    : " (não encontrado)"
);

// ---- banco ----
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(
  `select e.name, e.registration, e.external_id, e.admission_date,
          a.planned_min, a.worked_min, a.unjustified_min, a.justified_min, a.tolerance_min,
          coalesce(h.total_min,0) he
   from employees e
   left join absenteeism_monthly a on a.employee_id = e.id and a.competencia = $2
   left join hour_extract_monthly h on h.employee_id = e.id and h.competencia = $2
   where upper(e.name) like $1`,
  [`%${nomeBusca}%`, competencia]
);
console.log("\n=== BANCO (via API)");
for (const r of rows) {
  console.log(
    ` ${r.name} (mat ${r.registration}, id API ${r.external_id}, admissão ${r.admission_date?.toISOString?.().slice(0, 10) ?? "-"})`
  );
  console.log(
    `   planejado=${fmt(r.planned_min ?? 0)} trabalhadas=${fmt(r.worked_min ?? 0)} falta=${fmt(r.unjustified_min ?? 0)} abonadas=${fmt(r.justified_min ?? 0)} atraso=${fmt(r.tolerance_min ?? 0)} HE=${fmt(r.he ?? 0)}`
  );
}
await db.end();

// ---- espelho cru da API ----
const BASE = "https://api.ezpointweb.com.br/ezweb-ws";
const EMPRESA = env.NOBRIPONTO_API_EMPRESA;
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
    usuario: env.NOBRIPONTO_API_USER,
    senha: env.NOBRIPONTO_API_PASSWORD,
  }),
});
const auth = { Authorization: `Bearer ${token}` };
const { listaDeFuncionarios: lista = [] } = await api(
  `/funcionario?empresa=${EMPRESA}&ocultarDemitidos=true`,
  { headers: auth }
);
const f = lista.find((x) => String(x.nome).toUpperCase().includes(nomeBusca));
if (!f) {
  console.log("\n=== API: funcionário NÃO está na lista de ativos (demitido no período?)");
  process.exit(0);
}
const [y, mo] = competencia.split("-").map(Number);
const fim = `${competencia}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;
const esp = await api(
  `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${f.id}&dataInicio=${competencia}-01&dataFim=${fim}`,
  { headers: auth }
);
console.log("\n=== ESPELHO CRU DA API (totais)");
console.log(" ", JSON.stringify(esp.totalColunas));
const dias = esp.dias ?? [];
const comCarga = dias.filter((d) => d.cargaHoraria && d.cargaHoraria !== "00:00");
console.log(`\n dias retornados: ${dias.length} · com carga: ${comCarga.length}`);
console.log(" primeiros 3 com carga:", JSON.stringify(comCarga.slice(0, 3)));
