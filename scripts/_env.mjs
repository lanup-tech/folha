import { readFileSync, existsSync } from "node:fs";

/**
 * Lê as credenciais procurando nos locais possíveis.
 *
 * Na máquina de desenvolvimento o arquivo é `.env.local` na raiz; na VPS o
 * deploy grava `rpa/.env` (fora do git). Os scripts liam só o primeiro, e por
 * isso a carga da API falhava silenciosamente no cron desde 14/08 — o robô do
 * Abono rodava, a carga não, e ninguém percebeu porque o erro só aparecia no
 * log do servidor.
 */
export function carregarEnv() {
  const candidatos = [
    ".env.local",
    ".env",
    "rpa/.env",
    "../.env.local",
    "../rpa/.env",
  ];
  const env = { ...process.env };
  let encontrado = null;

  for (const caminho of candidatos) {
    if (!existsSync(caminho)) continue;
    encontrado = caminho;
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      // O ARQUIVO tem precedência sobre variáveis do sistema: uma variável
      // solta no ambiente (de outro projeto, por exemplo) apontaria a carga
      // para o banco errado sem aviso nenhum.
      if (m) env[m[1]] = m[2].trim();
    }
    break;
  }

  if (!encontrado) {
    throw new Error(
      `credenciais não encontradas. Procurei em: ${candidatos.join(", ")}`
    );
  }
  return env;
}
