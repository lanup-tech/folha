import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EzpointClient, competenciaRange } from "@/lib/ezpoint/client";
import { parseDuration } from "@/lib/format";

/**
 * Carga de uma competência via API EzPoint:
 *   POST /api/import  { "competencia": "2026-05", "clientSlug": "funchal" }
 *
 * 1. GET /funcionario -> upsert employees (empresa resolvida pelo CNPJ)
 * 2. GET /espelhoDePontos por funcionário -> absenteeism_monthly + hour_extract_monthly
 *
 * Com o limite de 30 req/min, um quadro grande leva vários minutos — para o
 * volume da Funchal rode via cron na VPS ou localmente; em serverless (Vercel)
 * use apenas para testes com poucos funcionários.
 */

export const maxDuration = 300;

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase não configurado — preencha o .env.local" },
      { status: 503 }
    );
  }

  let ezpoint: EzpointClient;
  try {
    ezpoint = EzpointClient.fromEnv();
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const competencia: string = body.competencia ?? new Date().toISOString().slice(0, 7);
  const clientSlug: string = body.clientSlug ?? "funchal";
  const { dataInicio, dataFim } = competenciaRange(competencia);

  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: client } = await db.from("clients").select("id").eq("slug", clientSlug).single();
  if (!client) {
    return NextResponse.json({ error: `Cliente '${clientSlug}' não encontrado` }, { status: 404 });
  }

  const { data: run } = await db
    .from("import_runs")
    .insert({ client_id: client.id, competencia, source: "API", report: "espelho_de_pontos" })
    .select("id")
    .single();

  try {
    // ---- 1. Funcionários -> employees (empresa resolvida por CNPJ) ----
    const funcionarios = await ezpoint.listFuncionarios(true);

    const { data: companies } = await db
      .from("companies")
      .select("id, cnpj, name")
      .eq("client_id", client.id);
    const companyByCnpj = new Map(
      (companies ?? []).filter((c) => c.cnpj).map((c) => [onlyDigits(c.cnpj), c.id])
    );

    const employeeIdByApiId = new Map<string, string>();
    for (const f of funcionarios) {
      const cnpj = onlyDigits(f.cnpjCpfEmpresa);
      let companyId = companyByCnpj.get(cnpj);
      if (!companyId) {
        // CNPJ novo vindo da API — cria a empresa e o usuário renomeia no painel
        const { data: created } = await db
          .from("companies")
          .insert({ client_id: client.id, name: `CNPJ ${f.cnpjCpfEmpresa}`, cnpj: f.cnpjCpfEmpresa })
          .select("id")
          .single();
        companyId = created!.id;
        companyByCnpj.set(cnpj, companyId!);
      }

      const { data: emp } = await db
        .from("employees")
        .upsert(
          {
            company_id: companyId,
            registration: f.matricula,
            name: f.nome,
            cpf: onlyDigits(f.cpf) || null,
            pis: onlyDigits(f.pis) || null,
            role: f.cargo || null,
            admission_date: f.dataAdmissao || null,
          },
          { onConflict: "company_id,registration" }
        )
        .select("id")
        .single();
      if (emp) employeeIdByApiId.set(String(f.id), emp.id);
    }

    // ---- 2. Espelho de pontos -> fatos mensais ----
    let imported = 0;
    for (const f of funcionarios) {
      const employeeId = employeeIdByApiId.get(String(f.id));
      if (!employeeId) continue;

      const espelho = await ezpoint.espelhoDePontos(f.id, dataInicio, dataFim);
      const t = espelho.totalColunas;
      if (!t) continue;

      await db.from("absenteeism_monthly").upsert(
        {
          employee_id: employeeId,
          competencia,
          planned_min: parseDuration(t.cargaHoraria),
          worked_min:
            parseDuration(t.horasTrabalhadasDiurnas) + parseDuration(t.horasTrabalhadasNoturnas),
          tolerance_min: parseDuration(t.atraso),
          // "falta" do espelho é o total não trabalhado; a separação justificada ×
          // injustificada sai do cruzamento com o abono (RPA) — validar na prática
          unjustified_min: parseDuration(t.falta),
          justified_min: 0,
        },
        { onConflict: "employee_id,competencia" }
      );

      await db.from("hour_extract_monthly").upsert(
        {
          employee_id: employeeId,
          competencia,
          day_min: parseDuration(t.extraDiurna),
          night_min: parseDuration(t.extraNoturna),
          total_min: parseDuration(t.extraDiurna) + parseDuration(t.extraNoturna),
        },
        { onConflict: "employee_id,competencia" }
      );
      imported += 1;
    }

    if (run) {
      await db
        .from("import_runs")
        .update({ status: "OK", rows_imported: imported, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    return NextResponse.json({ ok: true, competencia, funcionarios: funcionarios.length, imported });
  } catch (e) {
    if (run) {
      await db
        .from("import_runs")
        .update({ status: "ERROR", error_message: String(e), finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
