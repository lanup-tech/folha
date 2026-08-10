import { Topbar } from "@/components/topbar";
import { EmployeesTable } from "@/components/tables/employees-table";
import { rankedEmployees } from "@/lib/data/aggregate";

export default function ColaboradoresPage() {
  const rows = rankedEmployees();
  return (
    <>
      <Topbar title="Colaboradores" />
      <main className="p-6">
        <EmployeesTable rows={rows} />
      </main>
    </>
  );
}
