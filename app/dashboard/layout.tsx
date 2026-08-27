import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";

/**
 * A sidebar é fixa em tela cheia e só a área de conteúdo rola — assim o
 * cabeçalho `sticky` de cada página gruda no topo do viewport ao rolar.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-60 shrink-0 bg-[var(--chrome)]" />}>
        <Sidebar />
      </Suspense>
      {/*
        O container de scroll NÃO pode ser flex: com `flex-col`, o header
        `sticky` fica preso ao fluxo do flex e rola junto. Um bloco simples
        dá ao sticky a referência correta de posicionamento.
      */}
      <div
        data-scroll-container
        className="scroll-slim min-w-0 flex-1 overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}
