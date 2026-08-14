/**
 * RPA — Relatório "Abono / Faltas Justificadas" (relFaltaJustificada.do).
 *
 *   cd rpa && npx tsx src/collect-abono.ts [AAAA-MM] [--visivel]
 *
 * É o único relatório sem endpoint de leitura na API EzPoint v1.5 (só POST de
 * escrita), e é o que carrega o MOTIVO — que decide abonada × justificada ×
 * desconsiderar. Absenteísmo e Extrato de Horas vêm da API (conciliação 30/30).
 *
 * Seletores confirmados na tela real (14/08/2026):
 *   #inicio / #fim              período (dd/mm/aaaa)
 *   #motivoTodos                select multiple — 34 motivos
 *   #empTodas                   select multiple — 3 empresas
 *   #extensao                   PDF(0) | XLS(1) | XLSX(2)
 *   #ocultarFuncDemitidos       checkbox (vem marcado)
 *   #autoAgrupar                "Agrupar Motivos por Funcionário" — manter DESmarcado
 *   Manage.okDownload()         dispara a geração/download
 *
 * O roteiro segue docs/processos-relatorios.md: período do mês cheio, TODOS os
 * motivos, TODAS as empresas, exportar XLSX.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { login } from "./login.js";

const args = process.argv.slice(2);
const visivel = args.includes("--visivel");
const competencia = args.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 7);

const [ano, mes] = competencia.split("-").map(Number);
const ultimoDia = new Date(ano, mes, 0).getDate();
const dataInicio = `01/${String(mes).padStart(2, "0")}/${ano}`;
const dataFim = `${ultimoDia}/${String(mes).padStart(2, "0")}/${ano}`;

const destino = resolve("..", "data", "raw", competencia);
mkdirSync(destino, { recursive: true });

console.log(`[rpa] competência ${competencia} · período ${dataInicio} a ${dataFim}`);

const { browser, page } = await login({ headless: !visivel });

try {
  await page.goto("https://www.nobriponto.com.br/relFaltaJustificada.do", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector("#inicio", { state: "visible", timeout: 30000 });

  // ---- período (o campo tem datepicker; preencher via JS evita o calendário) ----
  // Obs.: nada de funções nomeadas dentro de evaluate — o transpile do tsx
  // injeta um helper (__name) que não existe no contexto da página.
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

  // ---- todos os motivos e todas as empresas (selects multiple ocultos) ----
  const selecionados = await page.evaluate(() => {
    const contagem: Record<string, number> = { motivos: 0, empresas: 0 };
    for (const [chave, id] of [
      ["motivos", "motivoTodos"],
      ["empresas", "empTodas"],
    ]) {
      const sel = document.getElementById(id) as HTMLSelectElement | null;
      if (!sel) continue;
      for (const o of Array.from(sel.options)) o.selected = true;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      contagem[chave] = sel.options.length;
    }
    return contagem;
  });
  console.log(`[rpa] motivos: ${selecionados.motivos} · empresas: ${selecionados.empresas}`);
  if (!selecionados.motivos || !selecionados.empresas) {
    throw new Error("não foi possível selecionar motivos/empresas — tela pode ter mudado");
  }

  // ---- opções: XLSX, sem agrupar, ocultando demitidos (padrão da tela) ----
  await page.selectOption("#extensao", { label: "XLSX" }).catch(async () => {
    await page.selectOption("#extensao", "2");
  });
  await page.evaluate(() => {
    const agrupar = document.getElementById("autoAgrupar") as HTMLInputElement | null;
    if (agrupar?.checked) agrupar.click(); // relatório linha a linha, como no processo manual
  });

  // ---- gerar e capturar o download ----
  console.log("[rpa] gerando relatório…");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 180000 }),
    page.evaluate(() => {
      const w = window as unknown as { Manage?: { okDownload?: () => void } };
      if (w.Manage?.okDownload) w.Manage.okDownload();
      else document.querySelector<HTMLInputElement>('input[onclick*="okDownload"]')?.click();
    }),
  ]);

  const arquivo = join(destino, "AbonoDeFaltas.xlsx");
  await download.saveAs(arquivo);
  console.log(`[rpa] salvo: ${arquivo} (origem: ${download.suggestedFilename()})`);
  console.log(`[rpa] próximo passo: node scripts/ingest-competencia.mjs data/raw/${competencia} ${competencia}`);
} finally {
  await browser.close();
}
