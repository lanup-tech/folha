"use client";

import { useState } from "react";
import { Palette, SlidersHorizontal, Plug, Check } from "lucide-react";
import { activeClientBranding } from "@/lib/branding";

/**
 * Configurações do cliente final.
 *
 * Reúne o que hoje está no código ou combinado por fora: limites do indicador,
 * identidade visual (whitelabel) e estado das integrações.
 */
export function ConfiguracoesPanel() {
  const [limiteAtencao, setLimiteAtencao] = useState(5);
  const [limiteCritico, setLimiteCritico] = useState(10);
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    // TODO: persistir em `clients` / tabela de parâmetros quando o Auth entrar
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Secao
        icone={<SlidersHorizontal size={16} />}
        titulo="Parâmetros do indicador"
        descricao="Faixas que definem quando um colaborador entra em atenção ou em nível crítico no painel."
      >
        <div className="flex flex-wrap items-end gap-6">
          <Campo
            rotulo="Atenção a partir de"
            valor={limiteAtencao}
            onChange={setLimiteAtencao}
            cor="var(--status-warning)"
          />
          <Campo
            rotulo="Crítico a partir de"
            valor={limiteCritico}
            onChange={setLimiteCritico}
            cor="var(--status-critical)"
          />
          <button
            onClick={salvar}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {salvo ? <Check size={15} /> : null}
            {salvo ? "Salvo" : "Salvar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--ink-muted)]">
          O absenteísmo nunca pode passar de 100% — acima disso o painel gera alerta de
          qualidade em vez de exibir o número, porque indica erro na carga de dados.
        </p>
      </Secao>

      <Secao
        icone={<Palette size={16} />}
        titulo="Identidade visual"
        descricao="A marca aplicada ao painel deste cliente (whitelabel)."
      >
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="eyebrow mb-1.5">Cliente</p>
            <p className="text-sm font-medium">{activeClientBranding.name}</p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Cor de ação</p>
            <div className="flex items-center gap-2">
              <span
                className="h-7 w-7 rounded-md border border-[var(--line)]"
                style={{ background: activeClientBranding.primaryColor }}
              />
              <code className="text-sm tabular">{activeClientBranding.primaryColor}</code>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Cor institucional</p>
            <div className="flex items-center gap-2">
              <span
                className="h-7 w-7 rounded-md border border-[var(--line)]"
                style={{ background: activeClientBranding.darkColor }}
              />
              <code className="text-sm tabular">{activeClientBranding.darkColor}</code>
            </div>
          </div>
        </div>
      </Secao>

      <Secao
        icone={<Plug size={16} />}
        titulo="Integrações"
        descricao="Origem dos dados que alimentam o painel."
      >
        <div className="flex flex-col divide-y divide-[var(--line)]">
          <Integracao
            nome="API EzPoint Web"
            detalhe="Cadastro, jornada, faltas e horas extras"
            estado="ativa"
          />
          <Integracao
            nome="RPA — Abono de Faltas"
            detalhe="Coleta diária às 06:00 na VPS"
            estado="ativa"
          />
          <Integracao
            nome="Supabase"
            detalhe="Banco de dados do painel"
            estado="ativa"
          />
        </div>
      </Secao>
    </div>
  );
}

function Secao({
  icone,
  titulo,
  descricao,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-sunken)] text-[var(--ink-secondary)]">
          {icone}
        </span>
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">{descricao}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  cor,
}: {
  rotulo: string;
  valor: number;
  onChange: (v: number) => void;
  cor: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)]">
        <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
        {rotulo}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={100}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm tabular outline-none focus:border-[var(--brand-primary)]"
        />
        <span className="text-sm text-[var(--ink-muted)]">%</span>
      </div>
    </label>
  );
}

function Integracao({
  nome,
  detalhe,
  estado,
}: {
  nome: string;
  detalhe: string;
  estado: "ativa" | "pendente";
}) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{nome}</p>
        <p className="text-xs text-[var(--ink-muted)]">{detalhe}</p>
      </div>
      <span
        className={
          estado === "ativa"
            ? "flex items-center gap-1.5 rounded-md bg-[var(--status-good-bg)] px-2 py-1 text-xs font-semibold text-[var(--status-good)]"
            : "flex items-center gap-1.5 rounded-md bg-[var(--status-warning-bg)] px-2 py-1 text-xs font-semibold text-[var(--status-warning)]"
        }
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {estado === "ativa" ? "Ativa" : "Pendente"}
      </span>
    </div>
  );
}
