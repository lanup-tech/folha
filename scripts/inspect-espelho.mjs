/**
 * Inspeciona o espelho de pontos cru da API para um funcionário:
 *
 *   node scripts/inspect-espelho.mjs "ANA CAROLINA RODRIGUES" 2026-07
 *
 * Serve para descobrir quais campos a API expõe (afastamento, motivo do dia,
 * abonos) antes de decidir o que ainda depende de relatório/RPA.
 */
import { readFileSync } from "node:fs";

const nomeBusca = (process.argv[2] ?? "").toUpperCase();
const competencia = process.argv[3] ?? "2026-07";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const BASE = "https://api.ezpointweb.com.br/ezweb-ws";
const EMPRESA = env.EZPOINT_EMPRESA ?? env.NOBRIPONTO_API_EMPRESA;
const USUARIO = env.EZPOINT_USUARIO ?? env.NOBRIPONTO_API_USER;
const SENHA = env.EZPOINT_SENHA ?? env.NOBRIPONTO_API_PASSWORD;

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

const token = await api("/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ empresa: EMPRESA, usuario: USUARIO, senha: SENHA }),
});
const auth = { Authorization: `Bearer ${typeof token === "string" ? token : token.token}` };

const { listaDeFuncionarios: lista = [] } = await api(
  `/funcionario?empresa=${EMPRESA}&ocultarDemitidos=true`,
  { headers: auth }
);
const f = lista.find((x) => String(x.nome).toUpperCase().includes(nomeBusca));
if (!f) {
  console.error(`funcionário contendo "${nomeBusca}" não encontrado`);
  process.exit(1);
}

console.log("=== CADASTRO (GET /funcionario) ===");
console.log(JSON.stringify(f, null, 1));

const [y, mo] = competencia.split("-").map(Number);
const fim = `${competencia}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;
const esp = await api(
  `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${f.id}&dataInicio=${competencia}-01&dataFim=${fim}`,
  { headers: auth }
);

console.log("\n=== ESPELHO: chaves da raiz ===");
console.log(Object.keys(esp).join(", "));
console.log("\ndetalhesPeriodoSaldoInicialBH:", JSON.stringify(esp.detalhesPeriodoSaldoInicialBH));
console.log("\n=== TOTAIS ===");
console.log(JSON.stringify(esp.totalColunas, null, 1));
console.log("\n=== CHAVES DE UM DIA ===");
console.log(Object.keys(esp.dias?.[0] ?? {}).join(", "));
console.log("\n=== PRIMEIROS 5 DIAS ===");
console.log(JSON.stringify(esp.dias?.slice(0, 5), null, 1));
