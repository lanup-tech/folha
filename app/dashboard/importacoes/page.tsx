import { Topbar } from "@/components/topbar";
import { CheckCircle2, CircleDashed, Bot, Plug } from "lucide-react";

/**
 * Página de acompanhamento das cargas de dados (API Nobriponto + RPA na VPS).
 * Vai ler da tabela `import_runs` do Supabase quando as credenciais chegarem;
 * por enquanto mostra o desenho do pipeline por relatório.
 */
const sources = [
  {
    report: "01 Funcionários ativos",
    origin: "API",
    status: "aguardando credenciais",
    detail: "GET /funcionario — cadastro completo, empresa resolvida pelo CNPJ",
  },
  {
    report: "02 Extrato de Horas",
    origin: "API",
    status: "aguardando credenciais",
    detail: "GET /espelhoDePontos — HE diurna/noturna (extraDiurna/extraNoturna)",
  },
  {
    report: "02 Absenteísmo",
    origin: "API",
    status: "aguardando credenciais",
    detail: "GET /espelhoDePontos — carga horária, horas trabalhadas, faltas, atrasos",
  },
  {
    report: "02 Abono de Faltas",
    origin: "RPA",
    status: "aguardando VPS",
    detail: "Sem GET na API v1.5 — motivo, período abonado e CID vêm do robô na VPS",
  },
];

export default function ImportacoesPage() {
  return (
    <>
      <Topbar title="Importações de dados" />
      <main className="p-6">
        <div className="card max-w-4xl">
          <div className="border-b border-black/10 p-4 text-sm text-[var(--ink-secondary)]">
            Pipeline de carga por competência: API do ponto (Nobriponto/Lanup) para o que a API
            entrega, RPA agendado na VPS para os relatórios que só existem na interface web. Cada
            execução ficará registrada aqui com data, origem e status.
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                <th className="px-4 py-2 font-medium">Relatório</th>
                <th className="px-4 py-2 font-medium">Origem</th>
                <th className="px-4 py-2 font-medium">Conteúdo</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.report} className="border-b border-black/5">
                  <td className="px-4 py-3 font-medium">{s.report}</td>
                  <td className="px-4 py-3">
                    <span className="flex w-fit items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 text-xs font-semibold">
                      {s.origin === "API" ? <Plug size={13} /> : <Bot size={13} />}
                      {s.origin}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">{s.detail}</td>
                  <td className="px-4 py-3">
                    <span className="flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)]">
                      {s.status.startsWith("ok") ? (
                        <CheckCircle2 size={14} className="text-[var(--status-good)]" />
                      ) : (
                        <CircleDashed size={14} className="text-[var(--status-warning)]" />
                      )}
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
