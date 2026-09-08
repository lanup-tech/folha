/**
 * Executa a carga retroativa esperando o banco ficar livre.
 *
 *   node scripts/fila-retroativa.mjs 2026-06 2026-05 2026-04 2026-03 2026-02 2026-01
 *
 * A API do ponto limita 30 chamadas/minuto no total — duas cargas simultâneas
 * disputam essa cota e ambas ficam lentas. Por isso a fila espera qualquer
 * `import_run` em RUNNING terminar antes de iniciar a próxima competência.
 *
 * Detecta a conclusão pelo BANCO (import_runs), não por processo do sistema:
 * verificar processo é frágil entre plataformas e foi o que falhou antes,
 * fazendo duas cargas rodarem em paralelo.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const competencias = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}$/.test(a));
if (!competencias.length) {
  console.error("informe as competências (ex.: 2026-06 2026-05)");
  process.exit(1);
}

const env = carregarEnv();
const raiz = resolve(".");
const rpaDir = resolve("rpa");
const agora = () => new Date().toISOString().slice(11, 19);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function conectar() {
  return new pg.Client({
    connectionString: env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
}

/** Há carga em andamento? Considera parada a que não grava há 10 min. */
async function cargaEmAndamento() {
  const db = conectar();
  await db.connect();
  try {
    const { rows } = await db.query(`
      select r.competencia, r.started_at,
             (select max(imported_at) from absenteeism_monthly
               where competencia = r.competencia) ultima_gravacao
      from import_runs r
      where r.status = 'RUNNING'
      order by r.started_at desc limit 1`);
    if (!rows.length) return null;
    const r = rows[0];
    const ociosaMs = Date.now() - new Date(r.ultima_gravacao ?? r.started_at).getTime();
    // sem gravar há 10 min: processo morreu, não adianta esperar
    if (ociosaMs > 10 * 60 * 1000) return null;
    return r.competencia;
  } finally {
    await db.end();
  }
}

function rodar(titulo, comando, args, cwd) {
  console.log(`  [${agora()}] ${titulo}`);
  const r = spawnSync(comando, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const ultimas = saida.split("\n").filter((l) => l.trim());
  if (r.status !== 0) {
    console.log(`     FALHOU: ${ultimas.slice(-2).join(" | ").slice(0, 150)}`);
    return false;
  }
  const resumo = ultimas[ultimas.length - 1] ?? "";
  if (resumo) console.log(`     ${resumo.trim().slice(0, 130)}`);
  return true;
}

console.log(`=== FILA RETROATIVA · ${competencias.join(", ")}\n`);

// aguarda a fila ficar livre antes de começar
let esperando = await cargaEmAndamento();
while (esperando) {
  console.log(`[${agora()}] aguardando carga de ${esperando} terminar...`);
  await dormir(120000);
  esperando = await cargaEmAndamento();
}

const resultados = [];
for (const comp of competencias) {
  console.log(`\n--- ${comp}`);
  const abono = rodar("Abono (RPA)", "npx", ["tsx", "src/collect-abono.ts", comp], rpaDir);
  const carga = rodar("carga da API", "node", ["scripts/load-competencia-api.mjs", comp], raiz);
  if (!carga) {
    resultados.push(`${comp}: falhou na carga`);
    continue;
  }
  const montou = rodar("consolidação", "node", ["scripts/montar-competencia-api.mjs", comp], raiz);
  resultados.push(
    `${comp}: ${montou ? "ok" : "falhou ao consolidar"}${abono ? "" : " (sem abono)"}`
  );
}

console.log("\n=== RESUMO");
for (const r of resultados) console.log("  " + r);
