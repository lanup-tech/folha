/**
 * Estrutura de navegação do painel.
 *
 * Agrupa por natureza da tarefa: análise (o dia a dia), cadastros (o que o
 * cliente mantém) e configurações (o que raramente muda).
 */
export interface NavItem {
  href: string;
  label: string;
  /** nome do ícone em lucide-react (resolvido no componente) */
  icon: string;
  children?: NavItem[];
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Análise",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: "LayoutDashboard" },
      { href: "/dashboard/colaboradores", label: "Colaboradores", icon: "Users" },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        href: "/dashboard/cadastros",
        label: "Cadastros",
        icon: "FolderPlus",
        children: [
          { href: "/dashboard/motivos", label: "Motivos", icon: "ClipboardList" },
          { href: "/dashboard/usuarios", label: "Usuários", icon: "UserCog" },
        ],
      },
      {
        href: "/dashboard/configuracoes",
        label: "Configurações",
        icon: "Settings",
        children: [
          { href: "/dashboard/importacoes", label: "Importações", icon: "RefreshCcw" },
        ],
      },
    ],
  },
];

/** Todos os caminhos navegáveis, para destacar o item ativo. */
export function allPaths(): string[] {
  const out: string[] = [];
  for (const g of navGroups) {
    for (const i of g.items) {
      out.push(i.href);
      for (const c of i.children ?? []) out.push(c.href);
    }
  }
  return out;
}
