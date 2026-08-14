/**
 * Diagnóstico: por que a contagem de funcionários da API não bate com o banco.
 *
 *   node scripts/check-duplicates.mjs
 *
 * A chave de upsert é (company_id, registration) — dois funcionários da mesma
 * empresa com a MESMA matrícula colidem e viram uma linha só.
 */
import { readFileSync } from "node:fs";

const raw = JSON.parse(
  readFileSync("data/raw/2026-07/funcionarios_api.json", "utf8").replace(/^﻿/, "")
);
const lista = raw.listaDeFuncionarios ?? [];

const byKey = new Map();
for (const f of lista) {
  const key = `${String(f.cnpjCpfEmpresa ?? "").replace(/\D/g, "")}|${String(f.matricula ?? "").trim() || `ez-${f.id}`}`;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(f);
}

const colisoes = [...byKey.entries()].filter(([, v]) => v.length > 1);
console.log(`funcionários na API: ${lista.length} · chaves únicas (empresa+matrícula): ${byKey.size}`);
console.log(`colisões: ${colisoes.length}\n`);
for (const [key, fs] of colisoes) {
  console.log(`chave ${key}:`);
  for (const f of fs) {
    console.log(`  id=${f.id} matrícula=${f.matricula} ${f.nome} · ${f.cargo} · admissão ${f.dataAdmissao}`);
  }
}

const semMatricula = lista.filter((f) => !String(f.matricula ?? "").trim());
if (semMatricula.length) {
  console.log(`\nsem matrícula (usam ez-<id>): ${semMatricula.length}`);
  for (const f of semMatricula.slice(0, 10)) console.log(`  id=${f.id} ${f.nome}`);
}
