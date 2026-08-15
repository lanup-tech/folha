import { Topbar } from "@/components/topbar";
import { ConfiguracoesPanel } from "@/components/configuracoes-panel";

export default function ConfiguracoesPage() {
  return (
    <>
      <Topbar
        title="Configurações"
        subtitle="Parâmetros de cálculo, marca e integrações"
      />
      <main className="p-6">
        <ConfiguracoesPanel />
      </main>
    </>
  );
}
