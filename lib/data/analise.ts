import type { EmployeeMonth } from "../types";
import { absHoraMin } from "../types";
import { absRatio } from "../format";
import { companyLabel } from "./companies";
import { nivelDoCargo, nivelLabel, type NivelHierarquico } from "./dimensoes";

/**
 * Agregações que respondem "quem está puxando o indicador".
 *
 * A leitura por percentual sozinha engana: um setor de 2 pessoas com 40% pesa
 * menos no resultado que um de 90 pessoas com 12%. Por isso toda agregação traz
 * TAMBÉM a contribuição em horas e o quanto ela representa do total — é o que
 * permite priorizar ação.
 */

export type Dimensao = "empresa" | "setor" | "cargo" | "nivel" | "motivo";

export const dimensaoLabel: Record<Dimensao, string> = {
  empresa: "Empresa",
  setor: "Setor",
  cargo: "Cargo",
  nivel: "Nível hierárquico",
  motivo: "Motivo predominante",
};

export interface GrupoAnalise {
  chave: string;
  rotulo: string;
  headcount: number;
  plannedMin: number;
  absMin: number;
  unjustifiedMin: number;
  excusedMin: number;
  justifiedMin: number;
  ignoredMin: number;
  heMin: number;
  absPct: number;
  /** fatia deste grupo no total de horas de ausência (0..1) */
  participacao: number;
  /** quantos do grupo estão acima de 10% */
  criticos: number;
}

function chaveDe(e: EmployeeMonth, d: Dimensao): { chave: string; rotulo: string } {
  switch (d) {
    case "empresa":
      return { chave: e.company, rotulo: companyLabel[e.company] };
    case "setor":
      return { chave: e.sector || "—", rotulo: e.sector || "Sem setor" };
    case "cargo":
      return { chave: e.role || "—", rotulo: e.role || "Sem cargo" };
    case "nivel": {
      const n = nivelDoCargo(e.role);
      return { chave: n, rotulo: nivelLabel[n] };
    }
    case "motivo":
      return {
        chave: e.mainMotivo || "—",
        rotulo: e.mainMotivo || "Sem lançamento de abono",
      };
  }
}

export function agruparPor(
  employees: EmployeeMonth[],
  dimensao: Dimensao
): GrupoAnalise[] {
  const mapa = new Map<string, GrupoAnalise>();
  let totalAbs = 0;

  for (const e of employees) {
    const { chave, rotulo } = chaveDe(e, dimensao);
    const abs = absHoraMin(e);
    totalAbs += abs;

    const g =
      mapa.get(chave) ??
      {
        chave,
        rotulo,
        headcount: 0,
        plannedMin: 0,
        absMin: 0,
        unjustifiedMin: 0,
        excusedMin: 0,
        justifiedMin: 0,
        ignoredMin: 0,
        heMin: 0,
        absPct: 0,
        participacao: 0,
        criticos: 0,
      };

    g.headcount += 1;
    g.plannedMin += e.plannedMin;
    g.absMin += abs;
    g.unjustifiedMin += e.unjustifiedMin;
    g.excusedMin += e.excusedMin;
    g.justifiedMin += e.justifiedMin;
    g.ignoredMin += e.ignoredMin ?? 0;
    g.heMin += e.heMin;
    if (absRatio(abs, e.plannedMin) >= 0.1) g.criticos += 1;
    mapa.set(chave, g);
  }

  return [...mapa.values()]
    .map((g) => ({
      ...g,
      absPct: absRatio(g.absMin, g.plannedMin),
      participacao: totalAbs > 0 ? g.absMin / totalAbs : 0,
    }))
    .sort((a, b) => b.absMin - a.absMin);
}

/** Níveis presentes, na ordem hierárquica (não por volume). */
export function agruparPorNivelOrdenado(employees: EmployeeMonth[]): GrupoAnalise[] {
  const ordem: NivelHierarquico[] = [
    "GERENCIA",
    "COORDENACAO",
    "LIDERANCA",
    "TECNICO",
    "OPERACIONAL",
  ];
  const grupos = agruparPor(employees, "nivel");
  return grupos.sort(
    (a, b) =>
      ordem.indexOf(a.chave as NivelHierarquico) -
      ordem.indexOf(b.chave as NivelHierarquico)
  );
}

/** Totais da seleção corrente — o cabeçalho de qualquer visão filtrada. */
export function totais(employees: EmployeeMonth[]) {
  const soma = (f: (e: EmployeeMonth) => number) =>
    employees.reduce((acc, e) => acc + f(e), 0);
  const plannedMin = soma((e) => e.plannedMin);
  const absMin = soma(absHoraMin);
  return {
    headcount: employees.length,
    plannedMin,
    absMin,
    unjustifiedMin: soma((e) => e.unjustifiedMin),
    excusedMin: soma((e) => e.excusedMin),
    justifiedMin: soma((e) => e.justifiedMin),
    ignoredMin: soma((e) => e.ignoredMin ?? 0),
    heMin: soma((e) => e.heMin),
    absPct: absRatio(absMin, plannedMin),
    criticos: employees.filter(
      (e) => absRatio(absHoraMin(e), e.plannedMin) >= 0.1
    ).length,
  };
}

/**
 * Opções disponíveis para os filtros, calculadas sobre o universo COMPLETO da
 * competência — assim o usuário nunca fica sem caminho de volta depois de
 * filtrar demais.
 */
export function opcoesDeFiltro(todos: EmployeeMonth[]) {
  const setores = new Map<string, number>();
  const cargos = new Map<string, number>();
  const niveis = new Map<string, number>();
  for (const e of todos) {
    const s = e.sector || "—";
    const c = e.role || "—";
    setores.set(s, (setores.get(s) ?? 0) + 1);
    cargos.set(c, (cargos.get(c) ?? 0) + 1);
    const n = nivelDoCargo(e.role);
    niveis.set(n, (niveis.get(n) ?? 0) + 1);
  }
  const ordenar = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([valor, total]) => ({ valor, total }))
      .sort((a, b) => a.valor.localeCompare(b.valor, "pt-BR"));
  return {
    setores: ordenar(setores),
    cargos: ordenar(cargos),
    // níveis na ordem hierárquica, e só os que têm gente: oferecer um filtro
    // que resulta em lista vazia é armadilha para quem explora
    niveis: (
      ["GERENCIA", "COORDENACAO", "LIDERANCA", "TECNICO", "OPERACIONAL"] as const
    )
      .map((valor) => ({ valor, total: niveis.get(valor) ?? 0 }))
      .filter((n) => n.total > 0),
  };
}
