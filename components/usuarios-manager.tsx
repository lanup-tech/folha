"use client";

import { useState } from "react";
import { Plus, Mail, ShieldCheck, Eye, UserCog } from "lucide-react";
import clsx from "clsx";

/**
 * Cadastro de usuários do painel.
 *
 * O modelo de acesso já existe no banco (tabela `memberships` + RLS): quem é
 * da equipe do tenant enxerga todos os clientes; quem é do cliente final vê
 * apenas o próprio. A persistência entra junto com o Supabase Auth.
 */

type Papel = "owner" | "admin" | "viewer";

interface Usuario {
  nome: string;
  email: string;
  papel: Papel;
  escopo: string;
  ativo: boolean;
}

const papelInfo: Record<Papel, { rotulo: string; descricao: string; classe: string }> = {
  owner: {
    rotulo: "Proprietário",
    descricao: "Acesso total, incluindo faturamento",
    classe: "bg-[var(--status-good-bg)] text-[var(--status-good)]",
  },
  admin: {
    rotulo: "Administrador",
    descricao: "Gerencia cadastros e usuários",
    classe: "bg-[#e8f1fb] text-[#1c5cab]",
  },
  viewer: {
    rotulo: "Visualizador",
    descricao: "Somente leitura dos painéis",
    classe: "bg-[var(--surface-sunken)] text-[var(--ink-secondary)]",
  },
};

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      nome: "Miller Lanup",
      email: "evento.miller@gmail.com",
      papel: "owner",
      escopo: "Nobriponto · todos os clientes",
      ativo: true,
    },
    {
      nome: "Equipe RH Funchal",
      email: "rh@funchal.com.br",
      papel: "admin",
      escopo: "Funchal · 3 empresas",
      ativo: true,
    },
    {
      nome: "Consulta Ponto",
      email: "consulta@nobriponto.com.br",
      papel: "viewer",
      escopo: "Funchal · somente leitura",
      ativo: true,
    },
  ]);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPapel, setNovoPapel] = useState<Papel>("viewer");

  function adicionar() {
    const nome = novoNome.trim();
    const email = novoEmail.trim().toLowerCase();
    if (!nome || !email.includes("@")) return;
    if (usuarios.some((u) => u.email === email)) return;
    setUsuarios([
      { nome, email, papel: novoPapel, escopo: "Funchal · 3 empresas", ativo: true },
      ...usuarios,
    ]);
    setNovoNome("");
    setNovoEmail("");
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="card p-4">
        <p className="eyebrow mb-3">Convidar usuário</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome completo"
            className="w-56 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
          />
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="email@empresa.com.br"
            className="w-64 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
          />
          <select
            value={novoPapel}
            onChange={(e) => setNovoPapel(e.target.value as Papel)}
            className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)]"
          >
            {(Object.keys(papelInfo) as Papel[]).map((p) => (
              <option key={p} value={p}>
                {papelInfo[p].rotulo}
              </option>
            ))}
          </select>
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={15} /> Convidar
          </button>
        </div>
        <p className="mt-2.5 text-xs text-[var(--ink-muted)]">
          O convite envia um e-mail de acesso. As permissões seguem as regras já aplicadas
          no banco: a equipe da Nobriponto enxerga todos os clientes; usuários do cliente
          final enxergam apenas a própria operação.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]">
              <th className="px-4 py-2.5">Usuário</th>
              <th className="px-4 py-2.5">Perfil</th>
              <th className="px-4 py-2.5">Escopo</th>
              <th className="px-4 py-2.5 text-right">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr
                key={u.email}
                className={clsx(
                  "border-b border-[var(--line)] last:border-0",
                  !u.ativo && "opacity-50"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--chrome)] text-xs font-semibold text-white">
                      {iniciais(u.nome)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{u.nome}</p>
                      <p className="flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                        <Mail size={11} />
                        {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                      papelInfo[u.papel].classe
                    )}
                  >
                    {u.papel === "viewer" ? <Eye size={12} /> : u.papel === "admin" ? <UserCog size={12} /> : <ShieldCheck size={12} />}
                    {papelInfo[u.papel].rotulo}
                  </span>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {papelInfo[u.papel].descricao}
                  </p>
                </td>
                <td className="px-4 py-3 text-[var(--ink-secondary)]">{u.escopo}</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={u.ativo}
                    onChange={() =>
                      setUsuarios((us) =>
                        us.map((x) => (x.email === u.email ? { ...x, ativo: !x.ativo } : x))
                      )
                    }
                    aria-label={`Ativar ${u.nome}`}
                    className="h-4 w-4 accent-[var(--brand-primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
