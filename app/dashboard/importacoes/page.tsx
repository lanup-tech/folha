import { Topbar } from "@/components/topbar";
import { CheckCircle2, AlertTriangle, Bot, Plug, Clock } from "lucide-react";
import saude from "@/data/saude-cargas.json";

/**
 * Estado real das cargas — lido de data/saude-cargas.json, gravado pelo ciclo
 * diário na VPS.
 *
 * Existe porque uma falha de carga ficou 25 dias invisível: o cron rodava, o
 * erro ia para um log no servidor e ninguém via. O painel precisa mostrar
 * quando o dado está velho, sem depender de alguém abrir terminal.
 */

const fontes = [
  {
    report: "Funcionários ativos",
    origin: "API",
    detail: "Cadastro, setor, cargo e empresa (por CNPJ)",
  },
  {
    report: "Espelho de pontos",
    origin: "API",
    detail: "Planejado, trabalhado, faltas, atrasos, abonos e horas extras",
  },
  {
    report: "Abono de Faltas",
    origin: "RPA",
    detail: "Motivo, período e CID — único relatório sem leitura pela API",
  },
];

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ImportacoesPage() {
  const problemas = saude.problemas ?? [];
  const saudavel = problemas.length === 0;

  return (
    <>
      <Topbar
        title="Importações de dados"
        subtitle={`Última verificação: ${formatarData(saude.verificadoEm)}`}
      />
      <main className="flex max-w-5xl flex-col gap-4 p-6">
        {/* estado geral */}
        <section
          className={
            saudavel
              ? "card flex items-start gap-3 border-l-4 border-l-[var(--status-good)] p-4"
              : "card flex items-start gap-3 border-l-4 border-l-[var(--status-critical)] p-4"
          }
        >
          {saudavel ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--status-good)]" />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--status-critical)]" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {saudavel ? "Cargas em dia" : `${problemas.length} problema(s) na carga de dados`}
            </p>
            {saudavel ? (
              <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                O ciclo diário está atualizando as competências normalmente.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1 text-xs text-[var(--ink-secondary)]">
                {problemas.map((p: string, i: number) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* competências carregadas */}
        <section className="card overflow-hidden">
          <header className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-sm font-semibold">Competências no banco</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
              Quando cada mês foi carregado pela última vez
            </p>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                <th className="px-4 py-2.5">Competência</th>
                <th className="px-4 py-2.5 text-right">Registros</th>
                <th className="px-4 py-2.5">Última carga</th>
                <th className="px-4 py-2.5 text-right">Idade</th>
              </tr>
            </thead>
            <tbody>
              {saude.competencias.map((c) => {
                const velho = c.diasAtras >= 2;
                return (
                  <tr key={c.competencia} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-2.5 font-medium tabular">{c.competencia}</td>
                    <td className="px-4 py-2.5 text-right tabular">{c.registros}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-secondary)] tabular">
                      {formatarData(c.ultimaCarga)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          velho
                            ? "rounded-md bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-warning)] tabular"
                            : "text-xs text-[var(--ink-secondary)] tabular"
                        }
                      >
                        {c.diasAtras === 0 ? "hoje" : `${c.diasAtras} dia${c.diasAtras === 1 ? "" : "s"}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* últimas execuções */}
        <section className="card overflow-hidden">
          <header className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-sm font-semibold">Últimas execuções</h2>
          </header>
          <table className="w-full text-sm">
            <tbody>
              {saude.ultimasExecucoes.map((e, i: number) => (
                <tr key={i} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--ink-secondary)] tabular">
                    {formatarData(e.quando)}
                  </td>
                  <td className="px-4 py-2.5 font-medium tabular">{e.competencia}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        e.status === "OK"
                          ? "rounded-md bg-[var(--status-good-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-good)]"
                          : e.status === "RUNNING"
                            ? "flex w-fit items-center gap-1 rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-secondary)]"
                            : "rounded-md bg-[var(--status-critical-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-critical)]"
                      }
                    >
                      {e.status === "RUNNING" && <Clock size={11} />}
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink-secondary)] tabular">
                    {e.linhas ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* origem dos dados */}
        <section className="card overflow-hidden">
          <header className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-sm font-semibold">Origem dos dados</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
              Ciclo diário às 06:00 na VPS
            </p>
          </header>
          <table className="w-full text-sm">
            <tbody>
              {fontes.map((f) => (
                <tr key={f.report} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-medium">{f.report}</td>
                  <td className="px-4 py-3">
                    <span className="flex w-fit items-center gap-1.5 rounded-md bg-[var(--surface-sunken)] px-2 py-1 text-xs font-semibold">
                      {f.origin === "API" ? <Plug size={12} /> : <Bot size={12} />}
                      {f.origin}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-secondary)]">{f.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
