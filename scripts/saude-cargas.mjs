/**
 * Saúde das cargas — responde "os dados estão atualizados?" sem depender de
 * alguém abrir o log da VPS.
 *
 *   node scripts/saude-cargas.mjs            # verifica e imprime
 *   node scripts/saude-cargas.mjs --json     # saída para consumo do painel
 *
 * Sai com código 1 quando encontra problema, para o cron sinalizar falha.
 *
 * Motivação: em 08/09 descobrimos que a carga da API falhava desde 14/08 sem
 * que ninguém percebesse — o cron rodava, o robô do Abono funcionava, e o erro
 * ficava só no log do servidor. O dado envelheceu 25 dias até o cliente
 * apontar um indicador inflado.
 */
import { writeFileSync } from "node:fs";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const env = carregarEnv();
const comoJson = process.argv.includes("--json");

/** Competência esperada como mais recente: o mês corrente. */
function competenciaCorrente() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const db = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const problemas = [];
const avisos = [];

// 1. quando cada competência foi carregada pela última vez
const { rows: competencias } = await db.query(`
  select competencia,
         count(*) registros,
         max(imported_at) ultima_carga,
         extract(day from now() - max(imported_at))::int dias_atras
  from absenteeism_monthly
  group by competencia
  order by competencia desc
  limit 6`);

// 2. execuções recentes do ciclo
const { rows: execucoes } = await db.query(`
  select competencia, source, report, status, rows_imported,
         error_message, started_at, finished_at
  from import_runs
  order by started_at desc
  limit 8`);

// 3. a competência corrente existe e está fresca?
const corrente = competenciaCorrente();
const cargaCorrente = competencias.find((c) => c.competencia === corrente);

if (!cargaCorrente) {
  problemas.push(
    `competência corrente (${corrente}) nunca foi carregada — o ciclo diário não está gravando`
  );
} else if (cargaCorrente.dias_atras >= 2) {
  problemas.push(
    `competência corrente (${corrente}) parada há ${cargaCorrente.dias_atras} dias — última carga em ${cargaCorrente.ultima_carga.toISOString().slice(0, 10)}`
  );
} else if (cargaCorrente.dias_atras === 1) {
  avisos.push(`competência corrente carregada ontem — normal se o cron ainda não rodou hoje`);
}

// 4. execuções que falharam RECENTEMENTE (últimas 48h)
//    Erros antigos já corrigidos não devem poluir o diagnóstico — o que
//    importa é se o ciclo está falhando AGORA.
const limiteRecente = Date.now() - 48 * 60 * 60 * 1000;
const comErro = execucoes.filter(
  (e) => e.status === "ERROR" && e.started_at.getTime() > limiteRecente
);
for (const e of comErro.slice(0, 3)) {
  problemas.push(
    `carga ${e.competencia} (${e.source}) falhou em ${e.started_at.toISOString().slice(0, 16)}: ${(e.error_message ?? "sem detalhe").slice(0, 90)}`
  );
}

// 5. execução travada (RUNNING há muito tempo)
const travadas = execucoes.filter(
  (e) => e.status === "RUNNING" && Date.now() - e.started_at.getTime() > 3 * 60 * 60 * 1000
);
for (const e of travadas) {
  problemas.push(
    `carga ${e.competencia} iniciada em ${e.started_at.toISOString().slice(0, 16)} segue RUNNING há mais de 3h — provavelmente interrompida`
  );
}

// 6. competência de mês fechado com dados incompletos
for (const c of competencias) {
  const [ano, mes] = c.competencia.split("-").map(Number);
  const ultimoDiaMes = new Date(ano, mes, 0);
  const mesJaFechou = ultimoDiaMes < new Date();
  if (!mesJaFechou) continue;
  // a carga precisa ter acontecido DEPOIS do fim do mês
  if (c.ultima_carga < ultimoDiaMes) {
    problemas.push(
      `${c.competencia} fechou em ${ultimoDiaMes.toISOString().slice(0, 10)} mas a última carga é de ${c.ultima_carga.toISOString().slice(0, 10)} — dados incompletos`
    );
  }
}

await db.end();

const resultado = {
  verificadoEm: new Date().toISOString(),
  competenciaCorrente: corrente,
  competencias: competencias.map((c) => ({
    competencia: c.competencia,
    registros: Number(c.registros),
    ultimaCarga: c.ultima_carga.toISOString(),
    diasAtras: c.dias_atras,
  })),
  ultimasExecucoes: execucoes.slice(0, 5).map((e) => ({
    competencia: e.competencia,
    status: e.status,
    quando: e.started_at.toISOString(),
    linhas: e.rows_imported,
    erro: e.error_message?.slice(0, 120) ?? null,
  })),
  problemas,
  avisos,
  saudavel: problemas.length === 0,
};

if (comoJson) {
  writeFileSync("data/saude-cargas.json", JSON.stringify(resultado, null, 2), "utf8");
  console.log("data/saude-cargas.json atualizado");
} else {
  console.log(`=== SAÚDE DAS CARGAS · ${new Date().toISOString().slice(0, 16)}`);
  console.log(`competência corrente: ${corrente}\n`);
  console.log("carregamentos por competência:");
  for (const c of competencias) {
    const marca = c.dias_atras >= 2 ? " (!)" : "";
    console.log(
      `  ${c.competencia}  ${String(c.registros).padStart(4)} registros  última: ${c.ultima_carga.toISOString().slice(0, 10)} (${c.dias_atras}d atrás)${marca}`
    );
  }
  console.log("\núltimas execuções:");
  for (const e of execucoes.slice(0, 5)) {
    console.log(
      `  ${e.started_at.toISOString().slice(0, 16)}  ${e.competencia}  ${e.status.padEnd(7)} ${e.rows_imported ?? "-"}${e.error_message ? `  ${e.error_message.slice(0, 60)}` : ""}`
    );
  }
  if (avisos.length) {
    console.log("\navisos:");
    for (const a of avisos) console.log(`  - ${a}`);
  }
  if (problemas.length) {
    console.log("\nPROBLEMAS:");
    for (const p of problemas) console.log(`  ! ${p}`);
  } else {
    console.log("\nsem problemas detectados");
  }
}

process.exit(problemas.length ? 1 : 0);
