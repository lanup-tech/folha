/**
 * RPA — Abono de Faltas (relatório sem endpoint na API do ponto).
 *
 * Esqueleto funcional: o fluxo de login/navegação/export precisa ser gravado
 * contra a tela real do Nobriponto (os seletores abaixo são placeholders).
 * Roda na VPS via cron — ver rpa/README.md.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const {
  RPA_PONTO_URL,
  RPA_PONTO_USER,
  RPA_PONTO_PASSWORD,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

interface AbonoRow {
  funcionario: string;
  empresa: string;
  motivo: string;
  data: string; // dd/mm/aaaa
  periodoAbonado: string; // 'O dia todo.' | '1º período.' | '2º período.'
  cid: string | null;
}

/** Regra hoje manual na planilha: dia todo = 8h, meio período = 4h. */
function grantedMinutes(periodoAbonado: string): number {
  return periodoAbonado.trim() === "O dia todo." ? 480 : 240;
}

function competenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  if (!RPA_PONTO_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Preencha RPA_PONTO_* e SUPABASE_* no .env antes de rodar.");
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const competencia = competenciaAtual();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const rows: AbonoRow[] = [];

  try {
    // 1. Login — AJUSTAR seletores para a tela real
    await page.goto(RPA_PONTO_URL);
    await page.fill('input[name="login"]', RPA_PONTO_USER ?? "");
    await page.fill('input[name="senha"]', RPA_PONTO_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    // 2. Relatório Abono de Faltas — AJUSTAR navegação/filtros/export
    // await page.click('text=Relatórios');
    // await page.click('text=Abono de Faltas');
    // ... selecionar competência, exportar, parsear linhas para `rows`

    // 3. Persistência
    for (const row of rows) {
      // resolução de employee_id/reason_id fica em uma RPC no Supabase
      await supabase.rpc("upsert_absence_record", {
        p_competencia: competencia,
        p_funcionario: row.funcionario,
        p_empresa: row.empresa,
        p_motivo: row.motivo,
        p_data: row.data,
        p_periodo: row.periodoAbonado,
        p_granted_min: grantedMinutes(row.periodoAbonado),
        p_cid: row.cid,
      });
    }

    await supabase.from("import_runs").insert({
      client_id: null, // resolvido por slug quando multi-cliente
      competencia,
      source: "RPA",
      report: "abono_faltas",
      status: "OK",
      rows_imported: rows.length,
      finished_at: new Date().toISOString(),
    });

    console.log(`[rpa] ${rows.length} registros de abono importados (${competencia})`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[rpa] falha na coleta:", err);
  process.exit(1);
});
