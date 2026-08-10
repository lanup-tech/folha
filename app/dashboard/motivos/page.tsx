import { Topbar } from "@/components/topbar";
import { MotivosManager } from "@/components/motivos-manager";
import { motivosBase } from "@/lib/data/motivos";

export default function MotivosPage() {
  return (
    <>
      <Topbar title="Motivos de ausência" />
      <main className="p-6">
        <p className="mb-4 max-w-3xl text-sm text-[var(--ink-secondary)]">
          Cadastro dos motivos e do tratamento de cada um no cálculo do absenteísmo. Esta base
          substitui a aba <em>motivos</em> da planilha de Abono de Faltas — o cliente final passa a
          manter tudo por aqui. <strong>Abonado</strong> entra na coluna ABONADA,{" "}
          <strong>Justificado</strong> na JUSTIFICADA e <strong>Desconsiderar</strong> fica fora do
          cálculo. (Persistência no Supabase será ativada junto com as credenciais.)
        </p>
        <MotivosManager initial={motivosBase} />
      </main>
    </>
  );
}
