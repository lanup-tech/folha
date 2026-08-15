"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Formulário de acesso.
 *
 * A autenticação real será do Supabase Auth (as tabelas e o RLS já estão
 * prontos em supabase/migrations). Enquanto as contas não são criadas, o
 * formulário valida o preenchimento e entra no painel.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!email.includes("@")) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (senha.length < 4) {
      setErro("A senha precisa ter ao menos 4 caracteres.");
      return;
    }

    setEnviando(true);
    // TODO: substituir por supabase.auth.signInWithPassword quando as contas
    // dos usuários do cliente forem criadas.
    await new Promise((r) => setTimeout(r, 450));
    router.push("/dashboard");
  }

  return (
    <form onSubmit={entrar} className="mt-7 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--ink-secondary)]">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@empresa.com.br"
          autoComplete="email"
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--ink-secondary)]">Senha</span>
        <div className="relative">
          <input
            type={verSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] px-3.5 py-2.5 pr-11 text-sm outline-none transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--brand-primary)]"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-primary)]"
          >
            {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      {erro && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--status-critical-bg)] px-3 py-2 text-xs font-medium text-[var(--status-critical)]"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando && <Loader2 size={15} className="animate-spin" />}
        {enviando ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-xs text-[var(--ink-muted)]">
        Problemas para acessar? Fale com o administrador da sua empresa.
      </p>
    </form>
  );
}
