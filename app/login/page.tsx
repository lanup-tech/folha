import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { activeClientBranding } from "@/lib/branding";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Entrar · NobriPonto Analytics",
};

/**
 * Login em duas colunas: à esquerda o painel de marca (whitelabel), à direita
 * o formulário. Em telas menores o painel some e o formulário centraliza.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* painel de marca */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[var(--chrome)] p-12 lg:flex">
        {/* textura sutil: malha de pontos, sem gradiente chamativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ background: "var(--brand-primary)", filter: "blur(120px)", opacity: 0.28 }}
        />

        <div className="relative">
          <div className="w-fit rounded-lg bg-white/95 px-3 py-2">
            <Image
              src={activeClientBranding.logoUrl}
              alt={activeClientBranding.name}
              width={132}
              height={38}
              priority
            />
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow mb-3 text-[var(--brand-primary)]">Gestão de absenteísmo</p>
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
            O indicador de presença da sua operação, atualizado todo dia.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--chrome-ink-dim)]">
            Horas planejadas, faltas, abonos e horas extras consolidados por empresa,
            setor e colaborador — direto do relógio de ponto.
          </p>
        </div>

        <div className="relative flex items-center gap-8 text-[var(--chrome-ink-dim)]">
          <Metrica valor="3" rotulo="empresas" />
          <Metrica valor="878" rotulo="colaboradores" />
          <Metrica valor="diário" rotulo="fechamento" />
        </div>
      </div>

      {/* formulário */}
      <div className="flex flex-1 items-center justify-center bg-[var(--surface-1)] px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Image
              src={activeClientBranding.logoUrl}
              alt={activeClientBranding.name}
              width={120}
              height={34}
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Entrar</h1>
          <p className="mt-1.5 text-sm text-[var(--ink-secondary)]">
            Acesse o painel com suas credenciais.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function Metrica({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="text-xl font-semibold text-white tabular">{valor}</p>
      <p className="text-xs">{rotulo}</p>
    </div>
  );
}
