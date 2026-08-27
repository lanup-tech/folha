import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { EmployeesTable } from "@/components/tables/employees-table";
import { FiltrosGlobais } from "@/components/filtros-globais";
import { TrilhaFiltros } from "@/components/trilha-filtros";
import { rankedEmployees } from "@/lib/data/aggregate";
import { employeesDaVisao, getCompetencia, permiteParcial } from "@/lib/data/competencias";
import { aplicarFiltros, filtrosDaQuery } from "@/lib/data/dimensoes";
import { opcoesDeFiltro, totais } from "@/lib/data/analise";
import { formatDuration, formatPercent } from "@/lib/format";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const comp = getCompetencia(params.competencia);
  const parcial = params.parcial === "1";
  const universo = employeesDaVisao(comp, parcial);

  const filtros = filtrosDaQuery(params);
  const employees = aplicarFiltros(universo, filtros);
  const rows = rankedEmployees(employees);
  const opcoes = opcoesDeFiltro(universo);
  const kpis = totais(employees);

  return (
    <>
      <Topbar
        title="Colaboradores"
        subtitle={`${kpis.headcount} no recorte · ABS ${formatPercent(kpis.absPct)} · ${formatDuration(kpis.absMin)} de ausência`}
        competencia={comp.key}
        mesEmCurso={permiteParcial(comp)}
        diaCorte={comp.diaCorte}
        parcial={parcial}
      />
      <main className="flex flex-col gap-4 p-6">
        <div className="card flex flex-col gap-3 p-4">
          <Suspense fallback={<div className="h-9" />}>
            <FiltrosGlobais
              filtros={filtros}
              setores={opcoes.setores}
              cargos={opcoes.cargos}
              niveis={opcoes.niveis}
              resultado={employees.length}
              universo={universo.length}
            />
          </Suspense>
          <Suspense fallback={null}>
            <TrilhaFiltros filtros={filtros} />
          </Suspense>
        </div>

        <EmployeesTable rows={rows} competencia={comp.label} competenciaKey={comp.key} />
      </main>
    </>
  );
}
