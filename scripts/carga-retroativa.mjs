/**
 * Carga retroativa de várias competências, em sequência:
 *
 *   node scripts/carga-retroativa.mjs 2026-01 2026-02 2026-03 2026-04 2026-05 2026-06
 *   node scripts/carga-retroativa.mjs --com-dias 2026-06     # inclui detalhe diário
 *
 * Cada competência passa por: Abono (RPA) → carga da API → consolidação →
 * validação. O detalhe diário é opcional porque dobra o tempo e só é
 * necessário para o gráfico dia a dia no drawer.
 *
 * É retomável: competências já carregadas HOJE são puladas, então uma
 * interrupção não obriga a refazer tudo. Cada etapa registra o resultado, e
 * uma falha não interrompe as competências seguintes.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const args = process.argv.slice(2);
const comDias = args.includes("--com-dias");
const forcar = args.includes("--forcar");
const competencias = args.filter((a) => /^\d{4}-\d{2}$/.test(a));

if (!competencias.length) {
  console.error("informe ao menos uma competência (ex.: 2026-01)");
  process.exit(1);
}

const env = carregarEnv();
const raiz = resolve(".");
const rpaDir = resolve("rpa");
const carimbo = () => new Date().toISOString().slice(11, 19);

function rodar(titulo, comando, argumentos, cwd) {
  console.log(`  [${carimbo()}] ${titulo}`);
  const r = spawnSync(comando, argumentos, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status !== 0) {
    const erro = saida.split("\n").filter(Boolean).slice(-3).join(" | ");
    console.log(`     FALHOU: ${erro.slice(0, 160)}`);
    return { ok: false, saida };
  }
  const resumo = saida.split("\n").filter((l) => l.trim()).slice(-1)[0] ?? "";
  if (resumo) console.log(`     ${resumo.trim().slice(0, 120)}`);
  return { ok: true, saida };
}

/** Já foi carregada hoje? Evita refazer trabalho numa retomada. */
async function jaCarregadaHoje(db, comp) {
  const { rows } = await db.query(
    `select count(*) n from absenteeism_monthly
     where competencia = $1 and imported_at::date = current_date`,
    [comp]
  );
  return Number(rows[0].n) > 0;
}

const db = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const resultados = [];
console.log(`=== CARGA RETROATIVA · ${competencias.length} competência(s)${comDias ? " (com detalhe diário)" : ""}\n`);

for (const comp of competencias) {
  console.log(`--- ${comp}`);

  if (!forcar && (await jaCarregadaHoje(db, comp))) {
    console.log("  já carregada hoje — pulando (use --forcar para refazer)\n");
    resultados.push({ comp, status: "pulada" });
    continue;
  }

  // 1. Abono de Faltas (RPA) — a fonte dos motivos
  const abono = rodar("Abono de Faltas (RPA)", "npx", ["tsx", "src/collect-abono.ts", comp], rpaDir);

  // 2. carga da API — cadastro + espelho mensal
  const carga = rodar("carga da API", "node", ["scripts/load-competencia-api.mjs", comp], raiz);
  if (!carga.ok) {
    resultados.push({ comp, status: "falhou na carga" });
    console.log("");
    continue;
  }

  // 3. detalhe diário (opcional — dobra o tempo)
  if (comDias) {
    rodar("detalhe diário", "node", ["scripts/carregar-dias.mjs", comp], raiz);
    rodar("exportar dias", "node", ["scripts/exportar-dias.mjs", comp], raiz);
  }

  // 4. consolidação
  const montou = rodar("consolidação", "node", ["scripts/montar-competencia-api.mjs", comp], raiz);
  if (!montou.ok) {
    resultados.push({ comp, status: "falhou na consolidação" });
    console.log("");
    continue;
  }

  // 5. validação — não interrompe, mas registra
  const valido = rodar("validação", "node", ["scripts/validar-competencia.mjs", comp], raiz);

  const arquivo = `data/competencias/${comp}.json`;
  resultados.push({
    comp,
    status: valido.ok ? "ok" : "carregada com ressalvas",
    abono: abono.ok,
    arquivo: existsSync(arquivo),
  });
  console.log("");
}

await db.end();

console.log("=== RESUMO");
for (const r of resultados) {
  console.log(`  ${r.comp}  ${r.status}${r.abono === false ? " (sem abono)" : ""}`);
}
const falhas = resultados.filter((r) => r.status.startsWith("falhou"));
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} concluídas`);
if (falhas.length) process.exitCode = 1;
