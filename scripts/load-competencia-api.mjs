/**
 * Carga de uma competência direto da API EzPoint para o Postgres (Supabase):
 *
 *   node scripts/load-competencia-api.mjs 2026-07
 *
 * 1. GET /funcionario        -> upsert sectors + employees (empresa por CNPJ)
 * 2. GET /espelhoDePontos    -> absenteeism_monthly + hour_extract_monthly
 *    (1 chamada por funcionário; limite 30 req/min -> ~35 min para ~870)
 * 3. Registro em import_runs
 *
 * Reexecutável: upserts idempotentes por (employee_id, competencia).
 */
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";
import { carregarEnv } from "./_env.mjs";

const competencia = process.argv[2] ?? new Date().toISOString().slice(0, 7);
const CLIENT_SLUG = process.argv[3] ?? "funchal";
const BASE = "https://api.ezpointweb.com.br/ezweb-ws";

// ---------- env ----------
const env = carregarEnv();
const EMPRESA = env.EZPOINT_EMPRESA ?? env.NOBRIPONTO_API_EMPRESA;
const USUARIO = env.EZPOINT_USUARIO ?? env.NOBRIPONTO_API_USER;
const SENHA = env.EZPOINT_SENHA ?? env.NOBRIPONTO_API_PASSWORD;
if (!env.SUPABASE_DB_URL || !EMPRESA) {
  console.error("SUPABASE_DB_URL e credenciais EZPOINT/NOBRIPONTO_API_* são obrigatórios no .env.local");
  process.exit(1);
}

const toMin = (v) => {
  const m = String(v ?? "").trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 160)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

// ---------- main ----------
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const [y, mo] = competencia.split("-").map(Number);
const dataInicio = `${competencia}-01`;
const dataFim = `${competencia}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;

const { rows: [client] } = await db.query("select id from clients where slug = $1", [CLIENT_SLUG]);
if (!client) throw new Error(`cliente '${CLIENT_SLUG}' não encontrado`);

const { rows: [run] } = await db.query(
  "insert into import_runs (client_id, competencia, source, report) values ($1, $2, 'API', 'funcionarios+espelho') returning id",
  [client.id, competencia]
);

try {
  console.log(`[load] login EzPoint (${EMPRESA})`);
  const token = await api("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empresa: EMPRESA, usuario: USUARIO, senha: SENHA }),
  });
  const auth = { Authorization: `Bearer ${typeof token === "string" ? token : token.token}` };

  console.log("[load] GET /funcionario");
  const { listaDeFuncionarios: funcionarios = [] } = await api(
    `/funcionario?empresa=${EMPRESA}&ocultarDemitidos=true`,
    { headers: auth }
  );
  console.log(`[load] ${funcionarios.length} funcionários ativos`);

  // ---- empresas por CNPJ ----
  const { rows: companies } = await db.query(
    "select id, cnpj from companies where client_id = $1",
    [client.id]
  );
  const companyByCnpj = new Map(
    companies.map((c) => [String(c.cnpj ?? "").replace(/\D/g, ""), c.id])
  );

  // ---- setores ----
  const sectorId = new Map(); // `${companyId}|${nome}` -> id
  async function ensureSector(companyId, nome) {
    if (!nome) return null;
    const key = `${companyId}|${nome}`;
    if (sectorId.has(key)) return sectorId.get(key);
    const { rows: [s] } = await db.query(
      `insert into sectors (company_id, name) values ($1, $2)
       on conflict (company_id, name) do update set name = excluded.name
       returning id`,
      [companyId, nome]
    );
    sectorId.set(key, s.id);
    return s.id;
  }

  // ---- funcionários ----
  const empIdByApiId = new Map();
  let skipped = 0;
  for (const f of funcionarios) {
    const cnpj = String(f.cnpjCpfEmpresa ?? "").replace(/\D/g, "");
    let companyId = companyByCnpj.get(cnpj);
    if (!companyId) {
      const { rows: [c] } = await db.query(
        "insert into companies (client_id, name, cnpj) values ($1, $2, $3) returning id",
        [client.id, `CNPJ ${f.cnpjCpfEmpresa}`, f.cnpjCpfEmpresa]
      );
      companyId = c.id;
      companyByCnpj.set(cnpj, companyId);
      console.log(`[load] empresa nova criada para CNPJ ${f.cnpjCpfEmpresa} — renomear no painel`);
    }
    const registration = String(f.matricula ?? "").trim() || `ez-${f.id}`;
    const sid = await ensureSector(companyId, (f.setor || f.departamento || "").trim());
    // Chave = external_id (id da API). A matrícula NÃO é única: o ponto aceita
    // duas pessoas com a mesma matrícula na mesma empresa (ex.: 6053 na Tattini).
    const { rows: [e] } = await db.query(
      `insert into employees (company_id, sector_id, registration, name, cpf, pis, role, admission_date, external_id)
       values ($1, $2, $3, $4, nullif($5, ''), nullif($6, ''), nullif($7, ''), nullif($8, '')::date, $9)
       on conflict (company_id, external_id) do update set
         sector_id = excluded.sector_id, registration = excluded.registration,
         name = excluded.name, cpf = excluded.cpf,
         pis = excluded.pis, role = excluded.role, admission_date = excluded.admission_date
       returning id`,
      [
        companyId,
        sid,
        registration,
        String(f.nome ?? "").trim(),
        String(f.cpf ?? "").replace(/\D/g, ""),
        String(f.pis ?? "").replace(/\D/g, ""),
        String(f.cargo ?? "").trim(),
        f.dataAdmissao ?? "",
        String(f.id),
      ]
    );
    empIdByApiId.set(f.id, e.id);
  }
  console.log(`[load] employees upsert: ${empIdByApiId.size} (${skipped} pulados)`);

  // ---- espelho por funcionário ----
  //
  // A API às vezes devolve o espelho VAZIO (totalColunas zerado / dias vazios)
  // de forma intermitente — reconsultando, os dados vêm certos. Gravar esse
  // vazio como 0 corrompe silenciosamente a competência (foi o que aconteceu
  // com 58 registros em 14/08). Por isso: valida a resposta e tenta de novo
  // antes de desistir; se ainda vier vazio, NÃO grava e reporta.
  let done = 0;
  let errors = 0;
  let vazios = 0;
  const suspeitos = [];

  const buscarEspelho = async (id) => {
    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
      await wait(2300); // 30 req/min com folga
      const esp = await api(
        `/espelhoDePontos?empresa=${EMPRESA}&idFuncionario=${id}&dataInicio=${dataInicio}&dataFim=${dataFim}`,
        { headers: auth }
      );
      const t = esp?.totalColunas;
      const temDias = Array.isArray(esp?.dias) && esp.dias.length > 0;
      // resposta legítima de quem não tem escala: dias presentes, tudo zero.
      // resposta suspeita: nem dias, nem totais -> vale reconsultar.
      if (t && (temDias || toMin(t.cargaHoraria) > 0)) return { esp, t, tentativas: tentativa };
    }
    return null;
  };

  for (const f of funcionarios) {
    const empId = empIdByApiId.get(f.id);
    if (!empId) continue;
    try {
      const resultado = await buscarEspelho(f.id);
      if (!resultado) {
        vazios += 1;
        suspeitos.push(f.nome);
        continue; // não grava zero: melhor faltar o registro do que gravar dado falso
      }
      const { t } = resultado;
      await db.query(
        `insert into absenteeism_monthly
           (employee_id, competencia, planned_min, worked_min, tolerance_min, justified_min, unjustified_min)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (employee_id, competencia) do update set
           planned_min = excluded.planned_min, worked_min = excluded.worked_min,
           tolerance_min = excluded.tolerance_min, justified_min = excluded.justified_min,
           unjustified_min = excluded.unjustified_min, imported_at = now()`,
        [
          empId,
          competencia,
          toMin(t.cargaHoraria),
          toMin(t.horasTrabalhadasDiurnas) + toMin(t.horasTrabalhadasNoturnas),
          toMin(t.atraso),
          // horasAbonadas da API = total abonado com a jornada correta do dia;
          // a classificação por motivo (abonada×desconsiderar) vem do abono (RPA)
          toMin(t.horasAbonadas),
          toMin(t.falta),
        ]
      );
      await db.query(
        `insert into hour_extract_monthly (employee_id, competencia, day_min, night_min, total_min)
         values ($1, $2, $3, $4, $5)
         on conflict (employee_id, competencia) do update set
           day_min = excluded.day_min, night_min = excluded.night_min,
           total_min = excluded.total_min, imported_at = now()`,
        [empId, competencia, toMin(t.extraDiurna), toMin(t.extraNoturna), toMin(t.extraDiurna) + toMin(t.extraNoturna)]
      );

      // Detalhe diário: essencial para o mês em curso (a API marca como falta
      // os dias que ainda não aconteceram) e útil para auditoria.
      for (const d of resultado.esp.dias ?? []) {
        const [dd, mm, aaaa] = String(d.data ?? "").split("/");
        if (!aaaa) continue;
        await db.query(
          `insert into espelho_dias
             (employee_id, competencia, dia, planned_min, worked_min, absence_min, late_min, excused_min, extra_min)
           values ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
           on conflict (employee_id, dia) do update set
             planned_min = excluded.planned_min, worked_min = excluded.worked_min,
             absence_min = excluded.absence_min, late_min = excluded.late_min,
             excused_min = excluded.excused_min, extra_min = excluded.extra_min,
             imported_at = now()`,
          [
            empId,
            competencia,
            `${aaaa}-${mm}-${dd}`,
            toMin(d.cargaHoraria),
            toMin(d.horasTrabalhadasDiurnas) + toMin(d.horasTrabalhadasNoturnas),
            toMin(d.falta),
            toMin(d.atraso),
            toMin(d.horasAbonadas),
            toMin(d.extraDiurna) + toMin(d.extraNoturna),
          ]
        );
      }
      done += 1;
    } catch (e) {
      errors += 1;
      if (errors <= 5) console.error(`[load] espelho ${f.nome}: ${String(e).slice(0, 120)}`);
    }
    if ((done + errors) % 25 === 0) {
      console.log(`[load] espelho ${done + errors}/${funcionarios.length} (erros: ${errors})`);
    }
  }

  const resumo = `${done} gravados, ${vazios} sem dados na API, ${errors} erros`;
  await db.query(
    "update import_runs set status = $3, rows_imported = $1, error_message = $4, finished_at = now() where id = $2",
    [done, run.id, vazios || errors ? "OK" : "OK", vazios || errors ? resumo : null]
  );
  console.log(`[load] CONCLUÍDO ${competencia}: ${resumo}`);
  if (suspeitos.length) {
    console.log(`[load] sem dados após 3 tentativas (${suspeitos.length}): ${suspeitos.slice(0, 15).join(", ")}${suspeitos.length > 15 ? "…" : ""}`);
    console.log("[load] rode novamente para completar — a carga é idempotente");
  }
} catch (e) {
  await db.query(
    "update import_runs set status = 'ERROR', error_message = $1, finished_at = now() where id = $2",
    [String(e).slice(0, 500), run.id]
  );
  console.error("[load] FALHA:", e);
  process.exitCode = 1;
} finally {
  await db.end();
}
