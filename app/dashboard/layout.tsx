import { Sidebar } from "@/components/sidebar";

/**
 * A sidebar é fixa em tela cheia e só a área de conteúdo rola — assim o
 * cabeçalho `sticky` de cada página gruda no topo do viewport ao rolar.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        data-scroll-container
        className="scroll-slim flex min-w-0 flex-1 flex-col overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}
