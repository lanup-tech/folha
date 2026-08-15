import { Topbar } from "@/components/topbar";
import { EmployeesTable } from "@/components/tables/employees-table";
import { rankedEmployees } from "@/lib/data/aggregate";
import { employeesDaVisao, getCompetencia, permiteParcial } from "@/lib/data/competencias";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string; parcial?: string }>;
}) {
  const params = await searchParams;
  const comp = getCompetencia(params.competencia);
  const parcial = params.parcial === "1";
  const rows = rankedEmployees(employeesDaVisao(comp, parcial));
  return (
    <>
      <Topbar
        title="Colaboradores"
        competencia={comp.key}
        mesEmCurso={permiteParcial(comp)}
        diaCorte={comp.diaCorte}
        parcial={parcial}
      />
      <main className="p-6">
        <EmployeesTable rows={rows} />
      </main>
    </>
  );
}
