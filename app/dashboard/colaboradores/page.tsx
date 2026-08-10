import { Topbar } from "@/components/topbar";
import { EmployeesTable } from "@/components/tables/employees-table";
import { rankedEmployees } from "@/lib/data/aggregate";
import { getCompetencia } from "@/lib/data/competencias";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>;
}) {
  const params = await searchParams;
  const comp = getCompetencia(params.competencia);
  const rows = rankedEmployees(comp.employees);
  return (
    <>
      <Topbar title="Colaboradores" competencia={comp.key} />
      <main className="p-6">
        <EmployeesTable rows={rows} />
      </main>
    </>
  );
}
