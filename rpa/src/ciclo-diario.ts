/**
 * Ciclo diário completo (é o que o cron da VPS executa):
 *
 *   npx tsx src/ciclo-diario.ts [AAAA-MM]
 *
 * 1. coleta o Abono de Faltas da competência (único relatório sem API)
 * 2. dispara a carga da API (cadastro + espelho) para o banco
 * 3. monta a competência consolidada
 *
 * Sem argumento, usa o mês corrente. Cada etapa registra o que fez; falha em
 * uma não impede o log das demais.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const competencia = process.argv[2] ?? new Date().toISOString().slice(0, 7);
const raiz = resolve("..");
const carimbo = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function etapa(titulo: string, comando: string, args: string[], cwd: string): boolean {
  console.log(`\n[${carimbo()}] === ${titulo}`);
  const r = spawnSync(comando, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error(`[${carimbo()}] FALHOU: ${titulo} (código ${r.status})`);
    return false;
  }
  return true;
}

console.log(`[${carimbo()}] ciclo diário — competência ${competencia}`);

const abono = etapa(
  "1/3 Abono de Faltas (RPA)",
  "npx",
  ["tsx", "src/collect-abono.ts", competencia],
  resolve(".")
);

const carga = etapa(
  "2/3 carga da API (cadastro + espelho)",
  "node",
  ["scripts/load-competencia-api.mjs", competencia],
  raiz
);

if (carga) {
  etapa(
    "3/3 consolidação da competência",
    "node",
    ["scripts/montar-competencia-api.mjs", competencia],
    raiz
  );
}

console.log(`\n[${carimbo()}] ciclo encerrado (abono=${abono ? "ok" : "falhou"}, carga=${carga ? "ok" : "falhou"})`);
