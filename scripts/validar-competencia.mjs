/**
 * Sanidade de uma competência montada, antes de publicá-la no painel:
 *
 *   node scripts/validar-competencia.mjs 2026-08
 *
 * Confere o que costuma dar errado: ABS acima de 100%, motivos fora da base,
 * quadro incompleto, cobertura do Abono e distribuição por empresa.
 * Sai com código 1 se encontrar problema grave (útil no cron).
 */
import { readFileSync, existsSync } from "node:fs";

const competencia = process.argv[2] ?? new Date().toISOString().slice(0, 7);
const caminho = `data/competencias/${competencia}.json`;
if (!existsSync(caminho)) {
  console.error(`[validar] ${caminho} não existe — monte a competência antes`);
  process.exit(1);
}

const d = JSON.parse(readFileSync(caminho, "utf8").replace(/^﻿/, ""));
const emp = d.employees ?? [];
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const soma = (f) => emp.reduce((a, e) => a + f(e), 0);
const absDe = (e) => e.unjustifiedMin + e.excusedMin + e.justifiedMin;

const planejado = soma((e) => e.plannedMin);
const absHora = soma(absDe);
const problemas = [];
const avisos = [];

console.log(`=== VALIDAÇÃO ${competencia} · origem: ${d.meta?.origem ?? "-"}`);
console.log(`colaboradores: ${emp.length}`);
if (!emp.length) {
  console.error("[validar] competência vazia");
  process.exit(1);
}

// 1. regra de ouro
const acima = emp.filter((e) => e.plannedMin > 0 && absDe(e) > e.plannedMin);
if (acima.length) {
  problemas.push(`${acima.length} colaborador(es) com ABS acima de 100%`);
  for (const e of acima.slice(0, 5)) {
    console.log(`   ! ${e.name}: ${fmt(absDe(e))} de ${fmt(e.plannedMin)}`);
  }
}

// 2. motivos desconhecidos
const desconhecidos = d.meta?.unknownMotivos ?? [];
if (desconhecidos.length) {
  problemas.push(`motivos fora da base: ${desconhecidos.join(", ")}`);
}

// 3. cobertura do Abono (sem ele, não há classificação de motivo)
const comMotivo = emp.filter((e) => e.mainMotivo).length;
const lancamentos = d.meta?.lancamentosAbono ?? d.meta?.sources?.abonoDeFaltas ?? 0;
if (!lancamentos) {
  problemas.push("nenhum lançamento de Abono — motivos não classificados");
}

// 4. distribuição por empresa (uma empresa zerada costuma ser erro de join)
const porEmpresa = emp.reduce((m, e) => ({ ...m, [e.company]: (m[e.company] ?? 0) + 1 }), {});
for (const chave of ["EMPREENDIMENTOS", "PARTICIPACOES", "TATTINI"]) {
  if (!porEmpresa[chave]) avisos.push(`empresa ${chave} sem colaboradores`);
}

// 5. mês inteiro ausente sem motivo (caso legítimo de RH, mas vale listar)
const semLancamento = emp.filter(
  (e) => e.plannedMin > 0 && absDe(e) >= e.plannedMin && !e.mainMotivo
);

console.log(`ABS% geral: ${((absHora / planejado) * 100).toFixed(2)}%`);
console.log(`planejado: ${fmt(planejado)} · ABS hora: ${fmt(absHora)}`);
console.log(`fora do cálculo: ${fmt(soma((e) => e.ignoredMin ?? 0))} · HE: ${fmt(soma((e) => e.heMin))}`);
console.log(`por empresa: ${JSON.stringify(porEmpresa)}`);
console.log(`com motivo classificado: ${comMotivo} · lançamentos de abono: ${lancamentos}`);

if (semLancamento.length) {
  console.log(`\natenção RH — mês inteiro ausente sem lançamento no Abono (${semLancamento.length}):`);
  for (const e of semLancamento.slice(0, 5)) console.log(`   ${e.name}`);
}
if (avisos.length) {
  console.log("\navisos:");
  for (const a of avisos) console.log(`   - ${a}`);
}
if (problemas.length) {
  console.log("\nPROBLEMAS:");
  for (const p of problemas) console.log(`   ! ${p}`);
  process.exit(1);
}
console.log("\n[validar] competência íntegra");
