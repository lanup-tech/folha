/**
 * RPA — Relatório de Absenteísmo (relAbsenteismo.do).
 *
 *   cd rpa && npx tsx src/collect-absenteismo.ts [AAAA-MM] [--visivel]
 *
 * A API cobre esses números (cargaHoraria/horasTrabalhadas/falta+atraso), mas o
 * relatório aplica as opções de cálculo do processo oficial — "Considerar
 * Atraso" + "Considerar Tolerância de Atraso/Falta" — e é a base histórica do
 * quadro. Automatizá-lo permite fechar uma competência sem exportação manual.
 *
 * Roteiro: docs/processos-relatorios.md §2.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { login } from "./login.js";

const args = process.argv.slice(2);
const visivel = args.includes("--visivel");
const competencia = args.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 7);

const [ano, mes] = competencia.split("-").map(Number);
const ultimoDia = new Date(ano, mes, 0).getDate();
const mm = String(mes).padStart(2, "0");
const dataInicio = `01/${mm}/${ano}`;
const dataFim = `${ultimoDia}/${mm}/${ano}`;

const destino = resolve("..", "data", "raw", competencia);
mkdirSync(destino, { recursive: true });

console.log(`[rpa] Absenteísmo ${competencia} · ${dataInicio} a ${dataFim}`);
const { browser, page } = await login({ headless: !visivel });

try {
  await page.goto("https://www.nobriponto.com.br/relAbsenteismo.do", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector("#inicio", { state: "visible", timeout: 30000 });

  await page.evaluate(
    ({ ini, fim }) => {
      for (const [id, v] of [
        ["inicio", ini],
        ["fim", fim],
      ]) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) {
          el.value = v;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    },
    { ini: dataInicio, fim: dataFim }
  );

  // Nesta tela o filtro obrigatório é FUNCIONÁRIOS (lista dupla). O botão
  // "Adicionar todos" é o que popula a lista de selecionados que o sistema lê —
  // marcar o <select> por JS não basta aqui (o Abono aceita, este não).
  const btnAdicionarTodos = page.locator(':text("Adicionar todos")');
  for (let i = 0; i < (await btnAdicionarTodos.count()); i += 1) {
    await btnAdicionarTodos.nth(i).scrollIntoViewIfNeeded().catch(() => {});
    await btnAdicionarTodos.nth(i).click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  const selecionadosTexto = await page
    .locator(':text("itens selecionados")')
    .first()
    .innerText()
    .catch(() => "?");
  console.log(`[rpa] ${selecionadosTexto.trim()}`);
  if (/^0 /.test(selecionadosTexto.trim())) {
    throw new Error("nenhum funcionário foi para a lista de selecionados");
  }

  // opções de cálculo do processo oficial: SOMENTE atraso + tolerância
  const opcoes = await page.evaluate(() => {
    const marcados: string[] = [];
    for (const el of Array.from(document.querySelectorAll('input[type=checkbox]'))) {
      const cb = el as HTMLInputElement;
      const rotulo = (
        cb.closest("label")?.textContent ??
        cb.parentElement?.textContent ??
        cb.id ??
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
      const querAtraso = /atraso|toler/i.test(rotulo);
      if (querAtraso && !cb.checked) cb.click();
      if (cb.checked) marcados.push(rotulo.slice(0, 40));
    }
    return marcados;
  });
  console.log(`[rpa] opções marcadas: ${opcoes.join(" | ") || "(nenhuma)"}`);

  await page.selectOption("#extensao", { label: "XLSX" }).catch(async () => {
    await page.selectOption("#extensao", "2");
  });

  // Este relatório processa UM funcionário POR REQUISIÇÃO antes de montar o
  // arquivo (~880 chamadas para o quadro da Funchal), então a geração leva
  // muitos minutos — daí o timeout generoso. O contador abaixo mostra o avanço
  // para não parecer travado.
  console.log("[rpa] baixando… (o servidor processa 1 funcionário por vez, pode levar 15+ min)");
  let processados = 0;
  page.on("response", (r) => {
    if (r.url().includes("processaDadosRelatorio")) {
      processados += 1;
      if (processados % 100 === 0) console.log(`[rpa]   ${processados} funcionários processados…`);
    }
  });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const btnBaixar = page.locator('a:has-text("Baixar"), button:has-text("Baixar"), input[value*="Baixar" i]').first();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 1_800_000 }), // 30 min
    btnBaixar.click(),
  ]);
  console.log(`[rpa] geração concluída após ${processados} requisições`);
  const arquivo = join(destino, "Absenteismo.xlsx");
  await download.saveAs(arquivo);
  console.log(`[rpa] salvo: ${arquivo} (origem: ${download.suggestedFilename()})`);
} finally {
  await browser.close();
}
