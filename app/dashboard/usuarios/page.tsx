import { Topbar } from "@/components/topbar";
import { UsuariosManager } from "@/components/usuarios-manager";

export default function UsuariosPage() {
  return (
    <>
      <Topbar
        title="Usuários"
        subtitle="Quem acessa o painel e o que cada um enxerga"
      />
      <main className="p-6">
        <UsuariosManager />
      </main>
    </>
  );
}
