import type { CompanyKey, EmployeeMonth } from "../types";
import { absHoraMin } from "../types";
import { absRatio } from "../format";

/**
 * Dimensões de análise do painel.
 *
 * IMPORTANTE — limitação da fonte: a API do ponto devolve `departamento` e
 * `setor` com o mesmo conteúdo na maioria dos cadastros, e não há campo de
 * gerência/liderança. Enquanto o cliente não fornecer o organograma, o nível
 * hierárquico é DERIVADO do cargo. É uma aproximação assumida, não um dado
 * oficial — por isso fica explícito na interface.
 */

export type NivelHierarquico =
  | "GERENCIA"
  | "COORDENACAO"
  | "LIDERANCA"
  | "TECNICO"
  | "OPERACIONAL";

export const nivelLabel: Record<NivelHierarquico, string> = {
  GERENCIA: "Gerência",
  COORDENACAO: "Coordenação",
  LIDERANCA: "Liderança",
  TECNICO: "Técnico",
  OPERACIONAL: "Operacional",
};

/** Ordem de exibição: do topo da estrutura para a base. */
export const niveisOrdenados: NivelHierarquico[] = [
  "GERENCIA",
  "COORDENACAO",
  "LIDERANCA",
  "TECNICO",
  "OPERACIONAL",
];

export function nivelDoCargo(cargo: string | undefined): NivelHierarquico {
  const c = (cargo ?? "").toUpperCase();
  if (/\bGERENTE|GERENCIA|DIRETOR/.test(c)) return "GERENCIA";
  if (/\bCOORDENADOR|\bCOORD\b/.test(c)) return "COORDENACAO";
  if (/\bSUPERVISOR|\bLIDER/.test(c)) return "LIDERANCA";
  if (/\bANALISTA|ASSISTENTE|CONSULTOR|\bANAL\b|BACK OFFICE/.test(c)) return "TECNICO";
  return "OPERACIONAL";
}

/** Faixas de severidade — as mesmas cores usadas nos badges da tabela. */
export type FaixaAbs = "OK" | "ATENCAO" | "CRITICO";

export const faixaLabel: Record<FaixaAbs, string> = {
  OK: "Até 5%",
  ATENCAO: "5% a 10%",
  CRITICO: "Acima de 10%",
};

export function faixaDoAbs(absPct: number): FaixaAbs {
  if (absPct >= 0.1) return "CRITICO";
  if (absPct >= 0.05) return "ATENCAO";
  return "OK";
}

/** Estado dos filtros — tudo vazio significa "sem restrição". */
export interface Filtros {
  empresas: CompanyKey[];
  setores: string[];
  cargos: string[];
  niveis: NivelHierarquico[];
  faixas: FaixaAbs[];
  busca: string;
}

export const filtrosVazios: Filtros = {
  empresas: [],
  setores: [],
  cargos: [],
  niveis: [],
  faixas: [],
  busca: "",
};

export function temFiltroAtivo(f: Filtros): boolean {
  return (
    f.empresas.length > 0 ||
    f.setores.length > 0 ||
    f.cargos.length > 0 ||
    f.niveis.length > 0 ||
    f.faixas.length > 0 ||
    f.busca.trim() !== ""
  );
}

export function contarFiltrosAtivos(f: Filtros): number {
  return (
    f.empresas.length +
    f.setores.length +
    f.cargos.length +
    f.niveis.length +
    f.faixas.length +
    (f.busca.trim() ? 1 : 0)
  );
}

export function aplicarFiltros(todos: EmployeeMonth[], f: Filtros): EmployeeMonth[] {
  const q = f.busca.trim().toLowerCase();
  return todos.filter((e) => {
    if (f.empresas.length && !f.empresas.includes(e.company)) return false;
    if (f.setores.length && !f.setores.includes(e.sector || "—")) return false;
    if (f.cargos.length && !f.cargos.includes(e.role || "—")) return false;
    if (f.niveis.length && !f.niveis.includes(nivelDoCargo(e.role))) return false;
    if (f.faixas.length) {
      const pct = absRatio(absHoraMin(e), e.plannedMin);
      if (!f.faixas.includes(faixaDoAbs(pct))) return false;
    }
    if (q) {
      const alvo = `${e.name} ${e.sector} ${e.role} ${e.registration}`.toLowerCase();
      if (!alvo.includes(q)) return false;
    }
    return true;
  });
}

/** Serializa para a URL, de modo que a visão filtrada seja compartilhável. */
export function filtrosParaQuery(f: Filtros): URLSearchParams {
  const q = new URLSearchParams();
  if (f.empresas.length) q.set("emp", f.empresas.join(","));
  if (f.setores.length) q.set("set", f.setores.join("~"));
  if (f.cargos.length) q.set("car", f.cargos.join("~"));
  if (f.niveis.length) q.set("niv", f.niveis.join(","));
  if (f.faixas.length) q.set("fx", f.faixas.join(","));
  if (f.busca.trim()) q.set("q", f.busca.trim());
  return q;
}

export function filtrosDaQuery(p: URLSearchParams | Record<string, string | undefined>): Filtros {
  const ler = (k: string): string =>
    (p instanceof URLSearchParams ? p.get(k) : p[k]) ?? "";
  const lista = (k: string, sep = ","): string[] =>
    ler(k) ? ler(k).split(sep).filter(Boolean) : [];
  return {
    empresas: lista("emp") as CompanyKey[],
    setores: lista("set", "~"),
    cargos: lista("car", "~"),
    niveis: lista("niv") as NivelHierarquico[],
    faixas: lista("fx") as FaixaAbs[],
    busca: ler("q"),
  };
}
