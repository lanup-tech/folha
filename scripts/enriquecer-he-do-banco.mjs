/**
 * Completa a HE do JSON da competência com o valor do banco (API), para os
 * casos em que o Extrato de Horas não foi exportado ou veio de outro mês:
 *
 *   node scripts/enriquecer-he-do-banco.mjs 2026-06
 *
 * A API é fonte confiável de HE (conciliação de julho: 616/704 em linha, e as
 * diferenças restantes estão catalogadas no backlog). Só preenche onde o JSON
 * está zerado — nunca sobrescreve HE já vinda do relatório.
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const competencia = process.argv[2] ?? "2026-06";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const caminho = `data/competencias/${competencia}.json`;
const json = JSON.parse(readFileSync(caminho, "utf8").replace(/^﻿/, ""));

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(
  `select e.name, e.registration, coalesce(h.total_min, 0) as he
   from hour_extract_monthly h join employees e on e.id = h.employee_id
   where h.competencia = $1`,
  [competencia]
);
await db.end();

const heByReg = new Map(rows.filter((r) => r.registration).map((r) => [r.registration, r.he]));
const heByName = new Map(rows.map((r) => [norm(r.name), r.he]));

let preenchidos = 0;
for (const e of json.employees) {
  if (e.heMin > 0) continue;
  const he = heByReg.get(e.registration) ?? heByName.get(norm(e.name)) ?? 0;
  if (he > 0) {
    e.heMin = he;
    preenchidos += 1;
  }
}

json.meta = json.meta ?? {};
json.meta.heComplementadaPelaApi = preenchidos;
writeFileSync(caminho, JSON.stringify(json, null, 2), "utf8");
console.log(`[he] ${preenchidos} colaboradores tiveram a HE preenchida pela API em ${competencia}`);
